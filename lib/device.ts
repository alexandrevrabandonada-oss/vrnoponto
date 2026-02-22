/**
 * Utility to manage unique device identification
 * Isomorphic safe: returns null if not in browser context
 */
export function getDeviceId(): string | null {
    if (typeof window === 'undefined') return null;

    let id = localStorage.getItem('vrnp_device_id');
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem('vrnp_device_id', id);
    }
    return id;
}
