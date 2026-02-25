/**
 * Simple IndexedDB wrapper for offline event queueing.
 * We avoid external heavy libraries (like localforage/idb) for this MVP to keep the bundle small.
 */

const DB_NAME = 'VRNP_OfflineQueue';
const STORE_NAME = 'events';
const DB_VERSION = 2;

export type OfflineEventKind = 'event_record' | 'event_rating';

export interface OfflineEvent {
    id: string; // client_event_id (uuid)
    kind?: OfflineEventKind;
    payload: Record<string, unknown>;
    status: 'PENDING' | 'SENT' | 'FAILED';
    created_at: number;
    retry_count: number;
    last_error?: string;
    dedupe_key?: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
    if (typeof window === 'undefined') return Promise.reject(new Error('IndexedDB is not available in SSR'));

    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
                const db = (event.target as IDBOpenDBRequest).result;
                let store: IDBObjectStore;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    store.createIndex('status', 'status', { unique: false });
                    store.createIndex('created_at', 'created_at', { unique: false });
                } else {
                    store = request.transaction!.objectStore(STORE_NAME);
                }

                if (!store.indexNames.contains('dedupe_key')) {
                    store.createIndex('dedupe_key', 'dedupe_key', { unique: false });
                }
            };
        });
    }
    return dbPromise;
}

function computeDedupeKey(event: OfflineEvent): string | undefined {
    const kind = event.kind || 'event_record';
    if (kind !== 'event_rating') return undefined;

    const deviceId = typeof event.payload.deviceId === 'string' ? event.payload.deviceId.trim() : '';
    const clientEventId = typeof event.payload.clientEventId === 'string' ? event.payload.clientEventId.trim() : '';
    if (!deviceId || !clientEventId) return undefined;

    return `event_rating:${deviceId}:${clientEventId}`;
}

export async function enqueueEvent(event: OfflineEvent): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const dedupeKey = computeDedupeKey(event);
        const normalizedEvent: OfflineEvent = {
            ...event,
            kind: event.kind || 'event_record',
            dedupe_key: dedupeKey
        };

        if (!dedupeKey) {
            const req = store.put(normalizedEvent);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
            return;
        }

        const byDedupe = store.index('dedupe_key').getAll(dedupeKey, 1);
        byDedupe.onsuccess = () => {
            const existing = (byDedupe.result as OfflineEvent[])[0];
            if (existing?.id) {
                const req = store.put({
                    ...existing,
                    payload: normalizedEvent.payload,
                    status: 'PENDING',
                    retry_count: 0,
                    last_error: undefined,
                    // keep original created_at for FIFO consistency
                    kind: normalizedEvent.kind,
                    dedupe_key: dedupeKey
                } as OfflineEvent);
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
                return;
            }

            const req = store.put(normalizedEvent);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        };
        byDedupe.onerror = () => reject(byDedupe.error);
    });
}

export async function getPendingEvents(limit = 20): Promise<OfflineEvent[]> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const index = store.index('status');
        const req = index.getAll('PENDING', limit);

        req.onsuccess = () => {
            // Sort by created_at ascending (FIFO)
            const results = (req.result as OfflineEvent[]).sort((a, b) => a.created_at - b.created_at);
            resolve(results);
        };
        req.onerror = () => reject(req.error);
    });
}

export async function removeEvent(id: string): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

export async function markEventFailed(id: string, errorMessage: string): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(id);

        req.onsuccess = () => {
            const data = req.result as OfflineEvent;
            if (data) {
                data.status = 'FAILED';
                data.last_error = errorMessage;
                store.put(data).onsuccess = () => resolve();
            } else {
                resolve();
            }
        };
        req.onerror = () => reject(req.error);
    });
}

export async function incrementRetry(id: string, errorMessage?: string): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(id);

        req.onsuccess = () => {
            const data = req.result as OfflineEvent;
            if (data) {
                data.retry_count = (data.retry_count || 0) + 1;
                if (errorMessage) data.last_error = errorMessage;
                store.put(data).onsuccess = () => resolve();
            } else {
                resolve();
            }
        };
        req.onerror = () => reject(req.error);
    });
}
export async function clearEventQueue(): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}
