type PdfTextItem = { str?: string; hasEOL?: boolean };
type PdfTextContent = { items: PdfTextItem[] };
type PdfPage = {
    getTextContent: (opts?: { disableNormalization?: boolean; includeMarkedContent?: boolean }) => Promise<PdfTextContent>;
    cleanup?: () => void;
};
type PdfDocument = {
    numPages: number;
    getPage: (pageNumber: number) => Promise<PdfPage>;
    destroy: () => Promise<void>;
};
type PdfLoadingTask = { promise: Promise<PdfDocument> };
type PdfJsModule = {
    getDocument: (opts: {
        data: Uint8Array;
        disableWorker?: boolean;
        isEvalSupported?: boolean;
        stopAtErrors?: boolean;
    }) => PdfLoadingTask;
};

type TextExtractResult = {
    text: string | null;
    engine: 'pdf-parse' | 'pdfjs' | null;
    errors: string[];
};

export type ParsedHourlyTrip = {
    dayGroup: 'WEEKDAY' | 'SAT' | 'SUN';
    hour: number;
    trips: number;
    promisedHeadwayMin: number | null;
};

export type ParseRunResult = {
    status: 'OK' | 'WARN' | 'FAIL';
    hourlyTrips: ParsedHourlyTrip[];
    meta: {
        timesFound: number;
        daySectionsFound: number;
        errors: string[];
        lineCode?: string | null;
        validFrom?: string | null;
        parserEngine?: string | null;
        extractErrors?: string[];
    };
};

function errorToMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (typeof err === 'string') return err;
    return String(err);
}

async function loadPdfJs(): Promise<PdfJsModule> {
    const mod = await import('pdfjs-dist/legacy/build/pdf.mjs');
    return mod as unknown as PdfJsModule;
}

type PdfParseTextResult = {
    text: string | null;
    error: string | null;
};

type PdfParseInstance = {
    getText: () => Promise<{ text?: string | null }>;
    destroy?: () => Promise<void>;
};

async function extractPdfTextWithPdfParse(pdfBuffer: Buffer): Promise<PdfParseTextResult> {
    let parser: PdfParseInstance | null = null;

    try {
        const mod = await import('pdf-parse');
        const PDFParseCtor = (mod as { PDFParse?: new (opts: { data: Buffer }) => PdfParseInstance }).PDFParse;

        if (typeof PDFParseCtor !== 'function') {
            return { text: null, error: 'Export PDFParse não encontrado no pacote pdf-parse.' };
        }

        const parserInstance = new PDFParseCtor({ data: pdfBuffer });
        parser = parserInstance;

        const result = await parserInstance.getText();
        const text = typeof result?.text === 'string' ? result.text : null;
        return { text, error: null };
    } catch (err) {
        return { text: null, error: errorToMessage(err) };
    } finally {
        if (parser?.destroy) {
            await parser.destroy().catch(() => undefined);
        }
    }
}

async function extractPageText(page: PdfPage): Promise<string> {
    const text = await page.getTextContent({ disableNormalization: false, includeMarkedContent: false });
    const lines: string[] = [];
    let currentLine = '';

    for (const item of text.items) {
        const chunk = (item.str || '').trim();
        if (!chunk) continue;

        currentLine = currentLine ? `${currentLine} ${chunk}` : chunk;

        if (item.hasEOL) {
            lines.push(currentLine);
            currentLine = '';
        }
    }

    if (currentLine) {
        lines.push(currentLine);
    }

    return lines.join('\n');
}

async function extractPdfTextWithPdfJs(pdfBuffer: Buffer): Promise<PdfParseTextResult> {
    let document: PdfDocument | null = null;

    try {
        const pdfjs = await loadPdfJs();
        const loadingTask = pdfjs.getDocument({
            data: new Uint8Array(pdfBuffer),
            disableWorker: true,
            isEvalSupported: false,
            stopAtErrors: false
        });

        document = await loadingTask.promise;

        const pages: string[] = [];
        for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
            const page = await document.getPage(pageNumber);
            const pageText = await extractPageText(page);
            if (pageText) pages.push(pageText);
            page.cleanup?.();
        }

        return { text: pages.join('\n'), error: null };
    } catch (err) {
        return { text: null, error: errorToMessage(err) };
    } finally {
        if (document) {
            await document.destroy().catch(() => undefined);
        }
    }
}

async function extractPdfText(pdfBuffer: Buffer): Promise<TextExtractResult> {
    const errors: string[] = [];

    const pdfParseResult = await extractPdfTextWithPdfParse(pdfBuffer);
    if (pdfParseResult.text) {
        return {
            text: pdfParseResult.text,
            engine: 'pdf-parse',
            errors
        };
    }
    if (pdfParseResult.error) {
        errors.push(`pdf-parse: ${pdfParseResult.error}`);
    }

    const pdfJsResult = await extractPdfTextWithPdfJs(pdfBuffer);
    if (pdfJsResult.text) {
        return {
            text: pdfJsResult.text,
            engine: 'pdfjs',
            errors
        };
    }
    if (pdfJsResult.error) {
        errors.push(`pdfjs: ${pdfJsResult.error}`);
    }

    return {
        text: null,
        engine: null,
        errors
    };
}

function detectMetadataFromText(textRaw: string): { lineCode: string | null, validFrom: string | null } {
    const text = textRaw.toUpperCase();

    const lineMatch = text.match(/LINHA[:\s-]*([0-9]{2,3}[A-Z]?)/);
    const lineCode = lineMatch ? lineMatch[1] : null;

    const contextualDateMatch = text.match(/(?:PARTIR|VIG[ÊE]NCIA|VIGOR|ATUALIZA[ÇC][ÃA]O).{0,50}?(\d{2}\/\d{2}\/\d{4})/);
    const fallbackDateMatch = text.match(/\b(\d{2}\/\d{2}\/\d{4})\b/);
    const validFrom = contextualDateMatch ? contextualDateMatch[1] : (fallbackDateMatch ? fallbackDateMatch[1] : null);

    return { lineCode, validFrom };
}

export async function detectMetadataFromPdf(pdfBuffer: Buffer): Promise<{ lineCode: string | null, validFrom: string | null }> {
    const extraction = await extractPdfText(pdfBuffer);
    if (!extraction.text) return { lineCode: null, validFrom: null };

    return detectMetadataFromText(extraction.text);
}

export async function parsePdfSchedule(pdfBuffer: Buffer): Promise<ParseRunResult> {
    const meta: ParseRunResult['meta'] = { timesFound: 0, daySectionsFound: 0, errors: [] };

    const extraction = await extractPdfText(pdfBuffer);
    meta.parserEngine = extraction.engine;
    if (extraction.errors.length > 0) {
        meta.extractErrors = extraction.errors;
    }

    if (!extraction.text) {
        meta.errors.push('Falha fatal no parser de PDF.');
        if (extraction.errors.length > 0) {
            meta.errors.push(extraction.errors[0]);
        }
        return { status: 'FAIL', hourlyTrips: [], meta };
    }

    const metadata = detectMetadataFromText(extraction.text);
    meta.lineCode = metadata.lineCode;
    meta.validFrom = metadata.validFrom;

    const lines = extraction.text.split('\n');

    const tripsMap: Record<'WEEKDAY' | 'SAT' | 'SUN', Record<number, number>> = {
        WEEKDAY: {},
        SAT: {},
        SUN: {}
    };

    let currentContext: 'WEEKDAY' | 'SAT' | 'SUN' = 'WEEKDAY';
    let defaultContextAssumed = true;

    for (let line of lines) {
        line = line.toUpperCase().trim();
        if (!line) continue;

        if (line.match(/DIAS?\s+ÚTEIS|DIA\s+UTIL/)) {
            currentContext = 'WEEKDAY';
            defaultContextAssumed = false;
            meta.daySectionsFound++;
            continue;
        }
        if (line.match(/SÁBADO|SABADO/)) {
            currentContext = 'SAT';
            defaultContextAssumed = false;
            meta.daySectionsFound++;
            continue;
        }
        if (line.match(/DOMINGO|FERIADO/)) {
            currentContext = 'SUN';
            defaultContextAssumed = false;
            meta.daySectionsFound++;
            continue;
        }

        const timeMatches = line.match(/([01]?\d|2[0-3])[:Hh.]([0-5]\d)/g);
        if (!timeMatches) continue;

        for (const t of timeMatches) {
            const hourStr = t.split(/[:Hh.]/)[0];
            const hour = parseInt(hourStr, 10);
            if (hour < 0 || hour > 23) continue;

            tripsMap[currentContext][hour] = (tripsMap[currentContext][hour] || 0) + 1;
            meta.timesFound++;
        }
    }

    const hourlyTrips: ParsedHourlyTrip[] = [];

    const calculateHeadway = (trips: number) => {
        if (trips >= 2) return Math.round((60.0 / trips) * 10) / 10;
        return null;
    };

    for (const [dayGroup, hourData] of Object.entries(tripsMap)) {
        for (const [hourStr, count] of Object.entries(hourData)) {
            if (count <= 0) continue;
            hourlyTrips.push({
                dayGroup: dayGroup as 'WEEKDAY' | 'SAT' | 'SUN',
                hour: parseInt(hourStr, 10),
                trips: count,
                promisedHeadwayMin: calculateHeadway(count)
            });
        }
    }

    let status: 'OK' | 'WARN' | 'FAIL' = 'OK';
    if (meta.timesFound === 0) {
        status = 'FAIL';
        meta.errors.push('Nenhum horário (HH:MM) encontrado no documento.');
    } else if (defaultContextAssumed) {
        status = 'WARN';
        meta.errors.push('Nenhum cabeçalho de dia localizado. Tudo associado como WEEKDAY por padrão.');
    }

    return { status, hourlyTrips, meta };
}
