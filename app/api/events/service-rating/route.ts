import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type ServiceRating = 'GOOD' | 'REGULAR' | 'BAD';

type StableResponse = {
    ok: boolean;
    saved: boolean;
    alreadyExisted: boolean;
    updated: boolean;
    error?: string;
};

type RatingRow = {
    id: string;
    rating: ServiceRating;
    rating_at: string;
    event_id: string | null;
};

const ALLOWED_RATINGS = new Set<ServiceRating>(['GOOD', 'REGULAR', 'BAD']);
const TEN_MINUTES_MS = 10 * 60 * 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
    return UUID_RE.test(value);
}

function response(body: StableResponse, status = 200) {
    return NextResponse.json(body, { status });
}

function humanError(message: string, status = 400) {
    return response(
        {
            ok: false,
            saved: false,
            alreadyExisted: false,
            updated: false,
            error: message
        },
        status
    );
}

function sanitizeReason(reason: string): string {
    return reason.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'unknown';
}

async function trackTelemetry(
    supabase: ReturnType<typeof createClient>,
    eventKey: string
): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);

    try {
        const { error } = await (supabase as unknown as {
            rpc: (fn: string, args: { p_event_key: string; p_date: string }) => Promise<{ error: { message?: string } | null }>;
        }).rpc('increment_telemetry', {
            p_event_key: eventKey,
            p_date: today
        });

        if (!error) return;

        await (supabase as unknown as {
            from: (table: string) => {
                upsert: (
                    values: { event_key: string; date: string; count: number },
                    options: { onConflict: string; ignoreDuplicates: boolean }
                ) => Promise<unknown>;
            };
        }).from('telemetry_counts').upsert(
            { event_key: eventKey, date: today, count: 1 },
            { onConflict: 'event_key,date', ignoreDuplicates: false }
        );
    } catch {
        // Telemetry is best-effort and must never block the main flow.
    }
}

export async function POST(req: NextRequest) {
    let supabase: ReturnType<typeof createClient> | null = null;

    try {
        const body = await req.json();
        const deviceId = typeof body?.deviceId === 'string' ? body.deviceId.trim() : '';
        const clientEventId = typeof body?.clientEventId === 'string' ? body.clientEventId.trim() : '';
        const eventIdRaw = typeof body?.eventId === 'string' ? body.eventId.trim() : '';
        const rating = typeof body?.rating === 'string' ? body.rating.toUpperCase() as ServiceRating : null;

        if (!deviceId) {
            return humanError('deviceId é obrigatório.');
        }
        if (!clientEventId || !isUuid(clientEventId)) {
            return humanError('clientEventId inválido.');
        }
        if (!rating || !ALLOWED_RATINGS.has(rating)) {
            return humanError('Avaliação inválida.');
        }
        if (eventIdRaw && !isUuid(eventIdRaw)) {
            return humanError('eventId inválido.');
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
        if (!supabaseUrl || !supabaseServiceRole) {
            return humanError('Serviço temporariamente indisponível.', 500);
        }

        supabase = createClient(supabaseUrl, supabaseServiceRole);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = supabase as any;
        await trackTelemetry(supabase, `service_rating_submit_${rating.toLowerCase()}`);

        let resolvedEventId: string | null = eventIdRaw || null;

        // Best-effort link: resolve event_id from stop_events when omitted.
        if (!resolvedEventId) {
            try {
                const { data } = await db
                    .from('stop_events')
                    .select('id')
                    .eq('device_id', deviceId)
                    .eq('client_event_id', clientEventId)
                    .maybeSingle();

                if (data?.id) {
                    resolvedEventId = data.id as string;
                }
            } catch {
                // Never fail request if linking could not be resolved.
            }
        }

        const { data: existing, error: existingError } = await db
            .from('event_service_ratings')
            .select('id, rating, rating_at, event_id')
            .eq('device_id', deviceId)
            .eq('client_event_id', clientEventId)
            .maybeSingle();

        if (existingError) {
            throw existingError;
        }

        if (!existing) {
            const { error: insertError } = await db
                .from('event_service_ratings')
                .insert({
                    device_id: deviceId,
                    client_event_id: clientEventId,
                    event_id: resolvedEventId,
                    rating
                });

            if (insertError) {
                throw insertError;
            }

            await trackTelemetry(supabase, 'service_rating_ok');
            return response({
                ok: true,
                saved: true,
                alreadyExisted: false,
                updated: false
            });
        }

        const current = existing as RatingRow;

        // Same rating -> keep idempotent; optionally enrich missing event link.
        if (current.rating === rating) {
            let updated = false;

            if (!current.event_id && resolvedEventId) {
                const { error: linkError } = await db
                    .from('event_service_ratings')
                    .update({ event_id: resolvedEventId })
                    .eq('id', current.id);

                if (!linkError) {
                    updated = true;
                }
            }

            await trackTelemetry(supabase, 'service_rating_ok');
            return response({
                ok: true,
                saved: true,
                alreadyExisted: true,
                updated
            });
        }

        const ratingAtMs = new Date(current.rating_at).getTime();
        const isWithinCorrectionWindow =
            Number.isFinite(ratingAtMs) && (Date.now() - ratingAtMs) <= TEN_MINUTES_MS;

        if (!isWithinCorrectionWindow) {
            await trackTelemetry(supabase, 'service_rating_fail_window_expired');
            return response({
                ok: false,
                saved: false,
                alreadyExisted: true,
                updated: false,
                error: 'Avaliação já registrada.'
            });
        }

        const updatePayload: { rating: ServiceRating; rating_at: string; event_id?: string } = {
            rating,
            rating_at: new Date().toISOString()
        };

        if (!current.event_id && resolvedEventId) {
            updatePayload.event_id = resolvedEventId;
        }

        const { error: updateError } = await db
            .from('event_service_ratings')
            .update(updatePayload)
            .eq('id', current.id);

        if (updateError) {
            throw updateError;
        }

        await trackTelemetry(supabase, 'service_rating_ok');
        return response({
            ok: true,
            saved: true,
            alreadyExisted: true,
            updated: true
        });
    } catch (error: unknown) {
        if (supabase) {
            const reason = sanitizeReason(error instanceof Error ? error.message : 'unknown');
            await trackTelemetry(supabase, `service_rating_fail_${reason}`);
        }

        return response(
            {
                ok: false,
                saved: false,
                alreadyExisted: false,
                updated: false,
                error: 'Não foi possível salvar sua avaliação agora.'
            },
            500
        );
    }
}
