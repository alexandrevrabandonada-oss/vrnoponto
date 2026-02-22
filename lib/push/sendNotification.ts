import webpush from 'web-push';
import { SupabaseClient } from '@supabase/supabase-js';

export interface PushMessage {
    title: string;
    body: string;
    data?: Record<string, unknown>;
}

export interface PushSubscriptionData {
    device_id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
}

type PushSubscriptionJSON = {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    }
};

function isWebPushResponse(x: unknown): x is { statusCode: number } {
    return typeof x === 'object' && x !== null && 'statusCode' in x;
}

function isObjectRecord(x: unknown): x is Record<string, unknown> {
    return typeof x === 'object' && x !== null;
}

/**
 * Sends a push notification with a 1-retry logic for transient errors,
 * logs results to push_send_logs, and deactivates endpoints on 404/410.
 */
export async function sendNotification(
    supabase: SupabaseClient,
    subscription: PushSubscriptionData,
    payload: PushMessage,
    type: 'IMMEDIATE' | 'DIGEST'
): Promise<{ ok: boolean; status: number; error?: string }> {
    const pushSub: PushSubscriptionJSON = {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth }
    };

    const payloadStr = JSON.stringify(payload);
    let retries = 0;
    let lastError: unknown = null;
    let statusCode: number | undefined;

    const attemptSend = async (): Promise<boolean> => {
        try {
            await webpush.sendNotification(pushSub, payloadStr);
            return true;
        } catch (e: unknown) {
            lastError = e;
            if (isWebPushResponse(e)) {
                statusCode = e.statusCode;
            }

            // 404/410 are permanent failures
            if (statusCode === 404 || statusCode === 410) {
                return false;
            }

            // Retry for 5xx or general failures (timeouts, etc.)
            if (!statusCode || statusCode >= 500) {
                if (retries < 1) {
                    retries++;
                    return await attemptSend();
                }
            }
            return false;
        }
    };

    const isOk = await attemptSend();

    // Log the result
    try {
        let errorMsg: string | null = null;
        if (isObjectRecord(lastError) && 'message' in lastError && typeof lastError.message === 'string') {
            errorMsg = lastError.message;
        } else if (lastError) {
            errorMsg = String(lastError);
        }

        await supabase.from('push_send_logs').insert({
            device_id: subscription.device_id,
            send_type: type,
            status: isOk ? 'OK' : 'FAIL',
            status_code: statusCode,
            error_message: errorMsg,
            retries: retries
        });
    } catch (logErr) {
        console.error('Failed to log push send:', logErr);
    }

    // Handle deactivation for dead endpoints
    if (statusCode === 404 || statusCode === 410) {
        try {
            await supabase
                .from('push_subscriptions')
                .update({
                    is_active: false,
                    deactivation_reason: String(statusCode)
                })
                .eq('endpoint', subscription.endpoint);
        } catch (deactivateErr) {
            console.error('Failed to deactivate dead endpoint:', deactivateErr);
        }
    }

    let finalError: string | undefined;
    if (isObjectRecord(lastError) && typeof lastError.message === 'string') {
        finalError = lastError.message;
    } else if (lastError) {
        finalError = String(lastError);
    }

    return {
        ok: isOk,
        status: statusCode || (isOk ? 200 : 500),
        error: finalError
    };
}
