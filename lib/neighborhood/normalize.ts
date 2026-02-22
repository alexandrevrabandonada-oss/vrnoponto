/**
 * Neighborhood Name Normalization
 * Server-only utility for consistent neighborhood name matching.
 */

/** Common Brazilian abbreviations → full forms */
const ABBREVIATIONS: Record<string, string> = {
    'V': 'VILA',
    'VL': 'VILA',
    'JD': 'JARDIM',
    'JDM': 'JARDIM',
    'S': 'SAO',
    'STA': 'SANTA',
    'STO': 'SANTO',
    'PQ': 'PARQUE',
    'PRQ': 'PARQUE',
    'RES': 'RESIDENCIAL',
    'CJ': 'CONJUNTO',
    'CONJ': 'CONJUNTO',
    'N': 'NOSSA',
    'NS': 'NOSSA SENHORA',
    'SR': 'SENHOR',
    'SRA': 'SENHORA',
    'AV': 'AVENIDA',
    'R': 'RUA',
    'DR': 'DOUTOR',
    'PROF': 'PROFESSOR',
    'ENG': 'ENGENHEIRO',
    'CEL': 'CORONEL',
    'CAP': 'CAPITAO',
    'SGT': 'SARGENTO',
    'TEN': 'TENENTE',
    'MAJ': 'MAJOR',
    'GEN': 'GENERAL',
    'PE': 'PADRE',
    'FR': 'FREI',
    'VER': 'VEREADOR',
    'DEP': 'DEPUTADO',
    'GOV': 'GOVERNADOR',
    'PRES': 'PRESIDENTE',
    'MIN': 'MINISTRO',
    'VSC': 'VILA SANTA CECILIA',
};

/**
 * Remove accents/diacritics from a string using NFD decomposition.
 */
function removeAccents(str: string): string {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Expand abbreviations found as standalone words.
 * Only replaces if the word is a standalone token (not part of a larger word).
 */
function expandAbbreviations(str: string): string {
    const words = str.split(/\s+/);
    return words.map(word => {
        // Remove trailing dots from abbreviations
        const clean = word.replace(/\.+$/, '');
        return ABBREVIATIONS[clean] || word;
    }).join(' ');
}

/**
 * Normalize a neighborhood name for consistent matching.
 *
 * Pipeline:
 * 1. Trim whitespace
 * 2. Uppercase
 * 3. Remove accents (NFD decomposition)
 * 4. Remove punctuation (dots, commas, dashes, quotes)
 * 5. Collapse multiple spaces
 * 6. Expand common abbreviations
 * 7. Final trim
 *
 * @example
 * normalizeNeighborhood("V. Sta. Cecília") => "VILA SANTA CECILIA"
 * normalizeNeighborhood("  jd.  AMÁLIA  ") => "JARDIM AMALIA"
 * normalizeNeighborhood("Açude I") => "ACUDE I"
 */
export function normalizeNeighborhood(raw: string | null | undefined): string {
    if (!raw) return '';

    let result = raw.trim();
    if (!result) return '';

    // Uppercase
    result = result.toUpperCase();

    // Remove accents
    result = removeAccents(result);

    // Remove common punctuation
    result = result.replace(/[.,\-'"´`]/g, ' ');

    // Collapse multiple spaces
    result = result.replace(/\s+/g, ' ').trim();

    // Expand abbreviations
    result = expandAbbreviations(result);

    // Final collapse (abbreviation expansion may introduce extra spaces)
    result = result.replace(/\s+/g, ' ').trim();

    return result;
}

/**
 * Check if abbreviations map has a direct alias for the full normalized string.
 * This handles cases like "VSC" → "VILA SANTA CECILIA".
 */
export function resolveDirectAlias(normalized: string): string | null {
    return ABBREVIATIONS[normalized] || null;
}

export { ABBREVIATIONS };
