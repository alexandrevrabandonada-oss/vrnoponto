/**
 * IndexedDB queue for optional bus photo proof uploads when offline.
 */

const DB_NAME = 'VRNP_OfflineProofQueue';
const STORE_NAME = 'proof_tasks';
const DB_VERSION = 1;

export interface OfflineProofTask {
    id: string;
    device_id: string;
    photo_data_url: string;
    mime_type: string;
    stop_id?: string | null;
    line_id?: string | null;
    lat?: number | null;
    lng?: number | null;
    ai_text?: string | null;
    ai_line_guess?: string | null;
    ai_confidence?: number | null;
    user_confirmed: boolean;
    client_event_id?: string | null;
    status: 'PENDING' | 'FAILED';
    created_at: number;
    retry_count: number;
    last_error?: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
    if (typeof window === 'undefined') return Promise.reject(new Error('IndexedDB unavailable in SSR'));

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

export async function enqueueProofTask(task: OfflineProofTask): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(task);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

export async function getPendingProofTasks(limit = 20): Promise<OfflineProofTask[]> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const index = store.index('status');
        const req = index.getAll('PENDING', limit);
        req.onsuccess = () => {
            const rows = (req.result as OfflineProofTask[]).sort((a, b) => a.created_at - b.created_at);
            resolve(rows);
        };
        req.onerror = () => reject(req.error);
    });
}

export async function updateProofTaskClientEvent(
    taskId: string,
    clientEventId: string,
    patch?: Partial<Pick<OfflineProofTask, 'stop_id' | 'line_id' | 'lat' | 'lng' | 'user_confirmed'>>
): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(taskId);

        req.onsuccess = () => {
            const row = req.result as OfflineProofTask | undefined;
            if (!row) {
                resolve();
                return;
            }
            row.client_event_id = clientEventId;
            if (patch?.stop_id !== undefined) row.stop_id = patch.stop_id;
            if (patch?.line_id !== undefined) row.line_id = patch.line_id;
            if (patch?.lat !== undefined) row.lat = patch.lat;
            if (patch?.lng !== undefined) row.lng = patch.lng;
            if (patch?.user_confirmed !== undefined) row.user_confirmed = patch.user_confirmed;
            store.put(row).onsuccess = () => resolve();
        };
        req.onerror = () => reject(req.error);
    });
}

export async function removeProofTask(id: string): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

export async function markProofTaskFailed(id: string, errorMessage: string): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(id);
        req.onsuccess = () => {
            const row = req.result as OfflineProofTask | undefined;
            if (!row) {
                resolve();
                return;
            }
            row.status = 'FAILED';
            row.last_error = errorMessage;
            store.put(row).onsuccess = () => resolve();
        };
        req.onerror = () => reject(req.error);
    });
}

export async function incrementProofRetry(id: string, errorMessage?: string): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(id);
        req.onsuccess = () => {
            const row = req.result as OfflineProofTask | undefined;
            if (!row) {
                resolve();
                return;
            }
            row.retry_count = (row.retry_count || 0) + 1;
            if (errorMessage) row.last_error = errorMessage;
            store.put(row).onsuccess = () => resolve();
        };
        req.onerror = () => reject(req.error);
    });
}
