/**
 * Client-side favorites storage (localStorage, no login required).
 * SSR-safe: all reads/writes guard against `typeof window === 'undefined'`.
 */

const STORAGE_KEY = 'vrnp_favorites';
const MAX_ITEMS = 10;

export interface Favorites {
    neighborhoods: string[];
    lines: string[];
}

function empty(): Favorites {
    return { neighborhoods: [], lines: [] };
}

export function getFavorites(): Favorites {
    if (typeof window === 'undefined') return empty();
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return empty();
        const parsed = JSON.parse(raw);
        return {
            neighborhoods: Array.isArray(parsed.neighborhoods) ? parsed.neighborhoods : [],
            lines: Array.isArray(parsed.lines) ? parsed.lines : [],
        };
    } catch {
        return empty();
    }
}

function save(favs: Favorites) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
}

/** Toggle a neighborhood favorite. Returns `true` if now favorited, `false` if removed. */
export function toggleFavoriteNeighborhood(slug: string): boolean {
    const favs = getFavorites();
    const normalized = slug.toLowerCase().trim();
    const idx = favs.neighborhoods.indexOf(normalized);

    if (idx >= 0) {
        favs.neighborhoods.splice(idx, 1);
        save(favs);
        return false;
    }

    // Dedupe + limit
    const unique = Array.from(new Set([...favs.neighborhoods, normalized]));
    favs.neighborhoods = unique.slice(0, MAX_ITEMS);
    save(favs);
    return true;
}

/** Toggle a line favorite. Returns `true` if now favorited, `false` if removed. */
export function toggleFavoriteLine(lineId: string): boolean {
    const favs = getFavorites();
    const idx = favs.lines.indexOf(lineId);

    if (idx >= 0) {
        favs.lines.splice(idx, 1);
        save(favs);
        return false;
    }

    const unique = Array.from(new Set([...favs.lines, lineId]));
    favs.lines = unique.slice(0, MAX_ITEMS);
    save(favs);
    return true;
}

export function isFavoriteNeighborhood(slug: string): boolean {
    return getFavorites().neighborhoods.includes(slug.toLowerCase().trim());
}

export function isFavoriteLine(lineId: string): boolean {
    return getFavorites().lines.includes(lineId);
}
