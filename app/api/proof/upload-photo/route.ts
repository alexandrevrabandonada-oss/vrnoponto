import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
const MAX_UPLOADS_PER_DAY = 6;
const COOLDOWN_SECONDS = 60;
const MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024;

function safeExt(fileName: string, mimeType: string): string {
    const fromName = fileName.split('.').pop()?.toLowerCase();
    if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
    if (mimeType.includes('png')) return 'png';
    if (mimeType.includes('webp')) return 'webp';
    if (mimeType.includes('heic')) return 'heic';
    return 'jpg';
}

function isValidDeviceId(deviceId: string): boolean {
    return /^[a-zA-Z0-9_-]{8,128}$/.test(deviceId);
}

async function checkUploadLimits(
    supabaseUrl: string,
    serviceKey: string,
    deviceId: string
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
    const supabase = createClient(supabaseUrl, serviceKey);
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const dayIso = startOfDay.toISOString();

    const { count: dailyCount, error: dailyErr } = await supabase
        .from('bus_photo_events')
        .select('id', { count: 'exact', head: true })
        .eq('device_id', deviceId)
        .gte('created_at', dayIso);

    if (dailyErr) {
        return { ok: false, status: 500, message: dailyErr.message };
    }

    if ((dailyCount || 0) >= MAX_UPLOADS_PER_DAY) {
        return {
            ok: false,
            status: 429,
            message: 'Você já enviou o limite de fotos de hoje. Tente novamente amanhã.'
        };
    }

    const { data: recentRowsRaw, error: recentErr } = await supabase
        .from('bus_photo_events')
        .select('created_at')
        .eq('device_id', deviceId)
        .order('created_at', { ascending: false })
        .limit(1);

    if (recentErr) {
        return { ok: false, status: 500, message: recentErr.message };
    }

    const recentRows = (recentRowsRaw || []) as Array<{ created_at: string }>;
    const lastCreatedAt = recentRows[0]?.created_at;
    if (lastCreatedAt) {
        const secondsSinceLast = (Date.now() - new Date(lastCreatedAt).getTime()) / 1000;
        if (secondsSinceLast < COOLDOWN_SECONDS) {
            return {
                ok: false,
                status: 429,
                message: 'Aguarde 1 minuto antes de enviar outra foto.'
            };
        }
    }

    return { ok: true };
}

export async function POST(req: Request) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
        if (!supabaseUrl || !serviceKey) {
            return NextResponse.json({ error: 'Supabase env missing' }, { status: 500 });
        }

        const formData = await req.formData();
        const file = formData.get('photo') as File | null;
        const deviceId = String(formData.get('device_id') || '').trim();

        if (!file || !deviceId) {
            return NextResponse.json({ error: 'photo and device_id are required' }, { status: 400 });
        }

        if (!isValidDeviceId(deviceId)) {
            return NextResponse.json({ error: 'device_id inválido.' }, { status: 400 });
        }

        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'Only image files are accepted' }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
            return NextResponse.json({ error: 'Imagem muito pesada. Limite de 3MB.' }, { status: 413 });
        }

        const limits = await checkUploadLimits(supabaseUrl, serviceKey, deviceId);
        if (!limits.ok) {
            return NextResponse.json({ error: limits.message }, { status: limits.status });
        }

        const supabase = createClient(supabaseUrl, serviceKey);
        const ext = safeExt(file.name || 'photo.jpg', file.type || 'image/jpeg');
        const path = `${deviceId}/${new Date().toISOString().slice(0, 10)}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

        const arrayBuffer = await file.arrayBuffer();
        const { error } = await supabase.storage
            .from('proof')
            .upload(path, arrayBuffer, {
                contentType: file.type || 'image/jpeg',
                upsert: false
            });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ ok: true, photo_path: path });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
