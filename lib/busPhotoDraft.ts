export interface BusPhotoDraft {
    id: string;
    mode: 'ONLINE' | 'OFFLINE';
    captured_at: number;
    device_id: string;
    stop_id?: string | null;
    line_id?: string | null;
    line_code?: string | null;
    lat?: number | null;
    lng?: number | null;
    photo_path?: string | null;
    proof_task_id?: string | null;
    ai_text?: string | null;
    ai_line_guess?: string | null;
    ai_confidence?: number | null;
    user_confirmed: boolean;
}

const STORAGE_KEY = 'vrnp_bus_photo_draft_v1';
const DEFAULT_TTL_MS = 5 * 60 * 1000;

function isBrowser(): boolean {
    return typeof window !== 'undefined';
}

export function saveBusPhotoDraft(draft: BusPhotoDraft): void {
    if (!isBrowser()) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

export function getBusPhotoDraft(): BusPhotoDraft | null {
    if (!isBrowser()) return null;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as BusPhotoDraft;
    } catch {
        return null;
    }
}

export function getRecentBusPhotoDraft(maxAgeMs = DEFAULT_TTL_MS): BusPhotoDraft | null {
    const draft = getBusPhotoDraft();
    if (!draft) return null;
    if (!draft.captured_at) return null;
    if (Date.now() - draft.captured_at > maxAgeMs) {
        clearBusPhotoDraft();
        return null;
    }
    return draft;
}

export function clearBusPhotoDraft(): void {
    if (!isBrowser()) return;
    localStorage.removeItem(STORAGE_KEY);
}
