/**
 * Parses QR code content and returns a target URL or null if invalid.
 * Supports:
 * - vrnp:stop:<id>
 * - https://.../ponto/<id>
 * - https://.../registrar?stopId=<id>
 * - /qr/<token> (legacy/compat)
 */
export function parseQrContent(text: string): string | null {
    if (!text) return null;

    const trimmed = text.trim();

    // 1. Short format vrnp:stop:<id>
    if (trimmed.startsWith('vrnp:stop:')) {
        const id = trimmed.replace('vrnp:stop:', '');
        return `/ponto/${id}`;
    }

    // 2. Legacy /qr/ format (as per existing QRScanner.tsx)
    if (trimmed.includes('/qr/')) {
        const token = trimmed.split('/qr/')[1];
        return `/qr/${token}`;
    }

    // 3. URL formats
    try {
        // Handle absolute or relative URLs
        const url = trimmed.startsWith('http') ? new URL(trimmed) : new URL(trimmed, 'https://vrnoponto.com.br');

        // Ponto detail
        if (url.pathname.includes('/ponto/')) {
            const id = url.pathname.split('/ponto/')[1].split('/')[0];
            return `/ponto/${id}`;
        }

        // Registration with stopId
        if (url.pathname.includes('/registrar') && url.searchParams.has('stopId')) {
            return url.pathname + url.search;
        }
    } catch (e) {
        // Not a valid URL
    }

    // 4. Fallback: if it looks like a UUID, assume it's a stop ID
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
        return `/ponto/${trimmed}`;
    }

    return null;
}
