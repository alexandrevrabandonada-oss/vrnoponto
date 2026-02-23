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
    };
};

async function loadPdfJs(): Promise<PdfJsModule> {
    const mod = await import('pdfjs-dist/legacy/build/pdf.mjs');
    return mod as unknown as PdfJsModule;
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

async function extractPdfText(pdfBuffer: Buffer): Promise<string | null> {
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

        return pages.join('\n');
    } catch {
        return null;
    } finally {
        if (document) {
            await document.destroy().catch(() => undefined);
        }
    }
}

export async function detectMetadataFromPdf(pdfBuffer: Buffer): Promise<{ lineCode: string | null, validFrom: string | null }> {
    const textRaw = await extractPdfText(pdfBuffer);
    if (!textRaw) return { lineCode: null, validFrom: null };

    const text = textRaw.toUpperCase();

    const lineMatch = text.match(/LINHA[:\s-]*([0-9]{2,3}[A-Z]?)/);
    const lineCode = lineMatch ? lineMatch[1] : null;

    const contextualDateMatch = text.match(/(?:PARTIR|VIG[ÊE]NCIA|VIGOR|ATUALIZA[ÇC][ÃA]O).{0,50}?(\d{2}\/\d{2}\/\d{4})/);
    const fallbackDateMatch = text.match(/\b(\d{2}\/\d{2}\/\d{4})\b/);
    const validFrom = contextualDateMatch ? contextualDateMatch[1] : (fallbackDateMatch ? fallbackDateMatch[1] : null);

    return { lineCode, validFrom };
}

export async function parsePdfSchedule(pdfBuffer: Buffer): Promise<ParseRunResult> {
    const meta: ParseRunResult['meta'] = { timesFound: 0, daySectionsFound: 0, errors: [] };

    const metadata = await detectMetadataFromPdf(pdfBuffer);
    meta.lineCode = metadata.lineCode;
    meta.validFrom = metadata.validFrom;

    const text = await extractPdfText(pdfBuffer);
    if (!text) {
        meta.errors.push('Falha fatal no parser de PDF.');
        return { status: 'FAIL', hourlyTrips: [], meta };
    }

    const lines = text.split('\n');

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

        const timeMatches = line.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g);
        if (!timeMatches) continue;

        for (const t of timeMatches) {
            const hourStr = t.split(':')[0];
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
