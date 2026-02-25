/**
 * Simple IndexedDB wrapper for offline event queueing.
 * We avoid external heavy libraries (like localforage/idb) for this MVP to keep the bundle small.
 */

const DB_NAME = 'VRNP_OfflineQueue';
const STORE_NAME = 'events';
const DB_VERSION = 1;

export interface OfflineEvent {
    id: string; // client_event_id (uuid)
    payload: Record<string, unknown>;
    status: 'PENDING' | 'SENT' | 'FAILED';
    created_at: number;
    retry_count: number;
    last_error?: string;
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
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    store.createIndex('status', 'status', { unique: false });
                    store.createIndex('created_at', 'created_at', { unique: false });
                }
            };
        });
    }
    return dbPromise;
}

export async function enqueueEvent(event: OfflineEvent): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(event);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
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
