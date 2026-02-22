export interface SuggestedLine {
    line_id: string;
    code: string;
    name: string;
    confidence: 'HIGH' | 'MED' | 'LOW';
    source: 'localStorage' | 'history' | 'top_lines' | 'fallback';
}

/**
 * Heuristic to suggest the most likely line for a stop
 * Priority:
 * 1. Last used line for this specific stop (localStorage)
 * 2. Most recent line used by device anywhere (last 7 days)
 * 3. Most popular line at this stop (API)
 */
export async function suggestLine(stopId: string, _deviceId?: string): Promise<SuggestedLine | null> {
    try {
        // 1. Check localStorage for this specific stop
        if (typeof window !== 'undefined') {
            const lastLine = localStorage.getItem(`last_line_for_stop:${stopId}`);
            if (lastLine) {
                try {
                    const parsed = JSON.parse(lastLine);
                    return {
                        ...parsed,
                        confidence: 'HIGH',
                        source: 'localStorage'
                    };
                } catch {
                    // Ignore parsing error
                    localStorage.removeItem(`last_line_for_stop:${stopId}`);
                }
            }
        }

        // 2. Fetch top lines for this stop from API (Fallback to popular lines)
        const res = await fetch(`/api/stop/top-lines?stop_id=${stopId}&limit=1&device_id=${_deviceId || ''}`);
        if (res.ok) {
            const data = await res.json();
            if (data.lines && data.lines.length > 0) {
                const top = data.lines[0];
                return {
                    line_id: top.line_id,
                    code: top.code,
                    name: top.name,
                    confidence: 'MED',
                    source: 'top_lines'
                };
            }
        }

        return null;
    } catch (error) {
        console.error('Heuristic suggestLine error:', error);
        return null;
    }
}

export function saveLastLine(stopId: string, line: { line_id: string, code: string, name: string }) {
    if (typeof window !== 'undefined') {
        localStorage.setItem(`last_line_for_stop:${stopId}`, JSON.stringify(line));
    }
}
