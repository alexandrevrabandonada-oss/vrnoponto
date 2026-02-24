import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

type FinalizeBody = {
    device_id: string;
    photo_path: string;
    stop_id?: string | null;
    line_id?: string | null;
    event_id?: string | null;
    client_event_id?: string | null;
    lat?: number | null;
    lng?: number | null;
    ai_text?: string | null;
    ai_line_guess?: string | null;
    ai_confidence?: number | null;
    user_confirmed?: boolean;
};

function normalizeLineCode(raw: string): string {
    return raw
        .toUpperCase()
        .replace(/^LINHA[\s:_-]*/i, '')
        .replace(/\s+/g, '')
        .trim();
}

function normalizeGuess(raw: string | null | undefined): string | null {
    if (!raw) return null;
    const norm = normalizeLineCode(raw);
    return norm.length > 0 ? norm : null;
}

export async function POST(req: Request) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
        if (!supabaseUrl || !serviceKey) {
            return NextResponse.json({ error: 'Supabase env missing' }, { status: 500 });
        }

        const body = (await req.json()) as FinalizeBody;
        const deviceId = String(body.device_id || '').trim();
        const photoPath = String(body.photo_path || '').trim();

        if (!deviceId || !photoPath) {
            return NextResponse.json({ error: 'device_id and photo_path are required' }, { status: 400 });
        }

        const supabase = createClient(supabaseUrl, serviceKey);

        let resolvedEventId: string | null = body.event_id || null;
        let resolvedStopId: string | null = body.stop_id || null;
        let resolvedLineId: string | null = body.line_id || null;

        if (!resolvedEventId && body.client_event_id) {
            const { data: foundEvent } = await supabase
                .from('stop_events')
                .select('id, stop_id, line_id')
                .eq('client_event_id', body.client_event_id)
                .eq('device_id', deviceId)
                .maybeSingle();

            if (foundEvent) {
                resolvedEventId = foundEvent.id;
                resolvedStopId = resolvedStopId || foundEvent.stop_id || null;
                resolvedLineId = resolvedLineId || foundEvent.line_id || null;
            }
        }

        const normalizedGuess = normalizeGuess(body.ai_line_guess);
        if (!resolvedLineId && normalizedGuess) {
            const candidates = normalizedGuess.startsWith('P')
                ? [normalizedGuess, normalizedGuess.slice(1)]
                : [normalizedGuess, `P${normalizedGuess}`];

            const { data: line } = await supabase
                .from('lines')
                .select('id')
                .in('code', candidates)
                .limit(1)
                .maybeSingle();

            if (line?.id) {
                resolvedLineId = line.id;
            }
        }

        const confidence = typeof body.ai_confidence === 'number'
            ? Math.max(0, Math.min(100, Math.round(body.ai_confidence)))
            : null;

        const { data, error } = await supabase
            .from('bus_photo_events')
            .insert({
                device_id: deviceId,
                stop_id: resolvedStopId,
                line_id: resolvedLineId,
                event_id: resolvedEventId,
                lat: body.lat ?? null,
                lng: body.lng ?? null,
                photo_path: photoPath,
                ai_text: body.ai_text ?? null,
                ai_line_guess: normalizedGuess,
                ai_confidence: confidence,
                user_confirmed: !!body.user_confirmed
            })
            .select('id, event_id, line_id')
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            ok: true,
            photo_event: data
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
