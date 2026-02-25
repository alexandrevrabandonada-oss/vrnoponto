'use client';

/**
 * Minimal Funnel Telemetry (8 Events)
 * Strictly anonymous counting of key user steps.
 * No PII, no detailed tracking.
 */

export const FUNNEL_EVENTS = {
    HOME_START: 'home_start',
    GPS_OK: 'gps_ok',
    STOP_SELECTED: 'stop_selected',
    CHECKIN_CONFIRMED: 'checkin_confirmed',
    REGISTRAR_OPEN: 'registrar_open',
    EVENT_RECORDED: 'event_recorded',
    SHARE_CLICKED: 'share_clicked',
    FOLLOW_OPTIN: 'follow_optin',
    QR_SCAN_OPEN: 'qr_scan_open',
    QR_SCAN_SUCCESS: 'qr_scan_success',
    QR_SCAN_FAIL: 'qr_scan_fail',
    DRAFT_BULK_APPROVE: 'operator_draft_bulk_approved',
    DRAFT_BULK_REJECT: 'operator_draft_bulk_rejected',
} as const;

export type FunnelEvent = typeof FUNNEL_EVENTS[keyof typeof FUNNEL_EVENTS];

const trackedInSession = new Set<string>();

/**
 * Tracks a funnel event with simple session-based deduplication.
 * We prioritize lean data over re-tracking repeat actions in one go.
 */
export function trackFunnel(event: FunnelEvent) {
    if (typeof window === 'undefined') return;

    // Simple session dedupe: don't spam the same event if already triggered in this load
    if (trackedInSession.has(event)) return;
    trackedInSession.add(event);

    fetch('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event })
    }).catch(() => {
        // Silent fail — telemetry should never break the app
    });
}
