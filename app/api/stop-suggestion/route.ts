import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const MAX_SUGGESTIONS_PER_DAY = 3;
const DEDUP_RADIUS_METERS = 30;
const DEDUP_WINDOW_DAYS = 7;

function trackTelemetry(event: string) {
    // Fire-and-forget telemetry (server-side)
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL ? '' : 'http://localhost:3000'}/api/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event }),
    }).catch(() => { /* silent */ });
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            name, notes, lat, lng, neighborhood,
            device_id, website
        } = body as {
            name?: string;
            notes?: string;
            lat?: number;
            lng?: number;
            neighborhood?: string;
            device_id?: string;
            website?: string; // honeypot
        };

        // Honeypot: bots fill hidden fields
        if (website) {
            // Silently accept to not tip off bots
            return NextResponse.json({ ok: true });
        }

        // Validate required fields
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json(
                { error: 'Nome do ponto é obrigatório' },
                { status: 400 }
            );
        }

        if (lat == null || lng == null || isNaN(Number(lat)) || isNaN(Number(lng))) {
            return NextResponse.json(
                { error: 'Coordenadas (lat, lng) são obrigatórias' },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        // Rate limiting by device_id (if provided)
        if (device_id) {
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

            const { count, error: countError } = await supabase
                .from('stop_suggestions')
                .select('id', { count: 'exact', head: true })
                .eq('device_id', device_id)
                .gte('created_at', oneDayAgo);

            if (!countError && count != null && count >= MAX_SUGGESTIONS_PER_DAY) {
                trackTelemetry('stop_suggestion_rate_limited');
                return NextResponse.json(
                    { error: 'Limite de sugestões diárias atingido. Tente novamente amanhã.' },
                    { status: 429 }
                );
            }
        }

        // Dedup: check for nearby PENDING suggestion
        const { data: nearby } = await supabase.rpc('rpc_find_nearby_pending_suggestion', {
            lat: Number(lat),
            lng: Number(lng),
            meters: DEDUP_RADIUS_METERS,
            days: DEDUP_WINDOW_DAYS,
        });

        if (nearby && nearby.length > 0) {
            // Found a nearby pending suggestion — increment its confirmations
            const existingId = nearby[0].id;

            const { data: newCount, error: incError } = await supabase.rpc(
                'rpc_increment_suggestion_confirmations',
                { suggestion_id: existingId }
            );

            if (incError) {
                console.error('increment confirmations error:', incError);
                return NextResponse.json(
                    { error: 'Erro ao confirmar sugestão existente' },
                    { status: 500 }
                );
            }

            trackTelemetry('stop_suggestion_deduped');
            return NextResponse.json({
                ok: true,
                deduped: true,
                id: existingId,
                confirmations: newCount ?? 1,
            });
        }

        // No nearby suggestion found — insert new
        const pointWKT = `POINT(${Number(lng)} ${Number(lat)})`;

        const { data: inserted, error: insertError } = await supabase
            .from('stop_suggestions')
            .insert({
                device_id: device_id || null,
                name_suggested: name.trim(),
                notes: notes?.trim() || null,
                geom: pointWKT,
                neighborhood_text: neighborhood?.trim() || null,
                source: 'user',
                confirmations: 1,
            })
            .select('id')
            .single();

        if (insertError) {
            console.error('stop-suggestion insert error:', insertError);
            return NextResponse.json(
                { error: 'Erro ao salvar sugestão' },
                { status: 500 }
            );
        }

        trackTelemetry('stop_suggestion_new');
        return NextResponse.json({
            ok: true,
            deduped: false,
            id: inserted?.id,
        });
    } catch (err: unknown) {
        console.error('POST /api/stop-suggestion:', err);
        const msg = err instanceof Error ? err.message : 'Erro interno';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
