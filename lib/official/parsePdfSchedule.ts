/**
 * Robust polyfills for DOM classes requested by pdf.js in Node.js environments.
 * This fixes "is not a function" errors in minified pdf.js code.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
if (typeof global !== 'undefined' && !global.DOMMatrix) {
    class DummyDOMMatrix {
        constructor() { }
        multiply() { return new DummyDOMMatrix(); }
        translate() { return new DummyDOMMatrix(); }
        scale() { return new DummyDOMMatrix(); }
        rotate() { return new DummyDOMMatrix(); }
        inverse() { return new DummyDOMMatrix(); }
        transformPoint(p: any) { return p || { x: 0, y: 0, z: 0, w: 1 }; }
    }
    (global as any).DOMMatrix = DummyDOMMatrix;
    (global as any).DOMPoint = class DOMPoint {
        constructor(public x = 0, public y = 0, public z = 0, public w = 1) { }
    };
    (global as any).DOMRect = class DOMRect {
        constructor(public x = 0, public y = 0, public width = 0, public height = 0) { }
    };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParser = require('pdf-parse');

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

/**
 * Detecta metadados (Linha e Data) de um PDF da PMVR.
 */
export async function detectMetadataFromPdf(pdfBuffer: Buffer): Promise<{ lineCode: string | null, validFrom: string | null }> {
    const RAW = await pdfParser(pdfBuffer).catch(() => null);
    if (!RAW) return { lineCode: null, validFrom: null };

    const text = RAW.text.toUpperCase();

    // Regex para Linha: Procura "LINHA:" seguido de números
    const lineMatch = text.match(/LINHA:?\s*(\d+)/);
    const lineCode = lineMatch ? lineMatch[1] : null;

    // Regex para Data: Procura "PARTIR" seguido de uma data DD/MM/AAAA
    const dateMatch = text.match(/PARTIR\s*(\d{2}\/\d{2}\/\d{4})/);
    const validFrom = dateMatch ? dateMatch[1] : null;

    return { lineCode, validFrom };
}

/**
 * Heurística de extração de PDFs da PMVR.
 */
export async function parsePdfSchedule(pdfBuffer: Buffer): Promise<ParseRunResult> {
    const meta: ParseRunResult['meta'] = { timesFound: 0, daySectionsFound: 0, errors: [] };

    // Detect Metadata (Line and ValidFrom)
    const metadata = await detectMetadataFromPdf(pdfBuffer);
    meta.lineCode = metadata.lineCode;
    meta.validFrom = metadata.validFrom;

    const RAW = await pdfParser(pdfBuffer).catch((e: Error) => {
        meta.errors.push(`Falha fatal no pdf-parse: ${e.message || e}`);
        return null;
    });

    if (!RAW) {
        return { status: 'FAIL', hourlyTrips: [], meta };
    }

    const text = RAW.text;
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

        // 1. Tentar detectar seção de dia
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

        // 2. Tentar achar tempos HH:MM nesta linha
        // Matches times like 05:30, 6:15, 22:00
        const timeMatches = line.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g);

        if (timeMatches) {
            for (const t of timeMatches) {
                const hourStr = t.split(':')[0];
                const hour = parseInt(hourStr, 10);

                if (hour >= 0 && hour <= 23) {
                    tripsMap[currentContext][hour] = (tripsMap[currentContext][hour] || 0) + 1;
                    meta.timesFound++;
                }
            }
        }
    }

    // 3. Gerar a saída
    const hourlyTrips: ParsedHourlyTrip[] = [];

    const calculateHeadway = (trips: number) => {
        if (trips >= 2) return Math.round((60.0 / trips) * 10) / 10;
        return null;
    };

    for (const [dayGroup, hourData] of Object.entries(tripsMap)) {
        for (const [hourStr, count] of Object.entries(hourData)) {
            if (count > 0) {
                hourlyTrips.push({
                    dayGroup: dayGroup as 'WEEKDAY' | 'SAT' | 'SUN',
                    hour: parseInt(hourStr, 10),
                    trips: count,
                    promisedHeadwayMin: calculateHeadway(count)
                });
            }
        }
    }

    let status: 'OK' | 'WARN' | 'FAIL' = 'OK';
    if (meta.timesFound === 0) {
        status = 'FAIL';
        meta.errors.push('Nenhum horário (HH:MM) encontrado no documento.');
    } else if (defaultContextAssumed) {
        status = 'WARN';
        meta.errors.push('Nenhum cabeçalho de dia (Dias Úteis/Sábado/Domingo) localizado. Tudo associado como WEEKDAY por padrão.');
    }

    return {
        status,
        hourlyTrips,
        meta
    };
}
