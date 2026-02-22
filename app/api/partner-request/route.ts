import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

// Simple in-memory rate limit store (resets on cold start — sufficient for edge rate limiting)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
        return true;
    }

    if (entry.count >= RATE_LIMIT) return false;

    entry.count++;
    return true;
}

export async function POST(req: Request) {
    try {
        const headersList = await headers();
        const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

        if (!checkRateLimit(ip)) {
            return NextResponse.json({ error: 'Muitas tentativas. Tente novamente amanhã.' }, { status: 429 });
        }

        const body = await req.json();

        // Honeypot check — bots fill hidden fields, humans don't
        if (body.website) {
            return NextResponse.json({ ok: true }); // Silently discard
        }

        const { name, neighborhood, contact_phone, contact_instagram, category, address, lat, lng, message, contact_name, variantKey } = body;

        // Minimum validation: name + neighborhood + at least one contact
        if (!name || !neighborhood || (!contact_phone && !contact_instagram)) {
            return NextResponse.json(
                { error: 'Preencha nome, bairro e pelo menos um contato (WhatsApp ou Instagram).' },
                { status: 400 }
            );
        }

        // Use service role to bypass RLS on insert (we need service_role to write to the table)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { error } = await supabase.from('partner_requests').insert({
            name: name.trim(),
            contact_name: contact_name?.trim() || null,
            contact_phone: contact_phone?.trim() || null,
            contact_instagram: contact_instagram?.trim() || null,
            neighborhood: neighborhood.trim(),
            address: address?.trim() || null,
            category: category || 'comercio',
            lat: lat ? parseFloat(lat) : null,
            lng: lng ? parseFloat(lng) : null,
            message: message?.trim() || null,
            status: 'PENDING'
        });

        if (error) throw error;

        // Success — log telemetry
        try {
            const today = new Date().toISOString().slice(0, 10);

            // Standard generic track
            await supabase.rpc('increment_telemetry', { p_event_key: 'partner_request_created', p_date: today });

            // Variant specific track
            if (variantKey && ['A', 'B'].includes(variantKey)) {
                await supabase.rpc('increment_telemetry', { p_event_key: `partner_request_created_${variantKey}`, p_date: today });
            }
        } catch { }

        return NextResponse.json({ ok: true });
    } catch (err: unknown) {
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro interno' }, { status: 500 });
    }
}
