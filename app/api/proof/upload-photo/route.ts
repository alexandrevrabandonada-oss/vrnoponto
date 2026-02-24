import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function safeExt(fileName: string, mimeType: string): string {
    const fromName = fileName.split('.').pop()?.toLowerCase();
    if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
    if (mimeType.includes('png')) return 'png';
    if (mimeType.includes('webp')) return 'webp';
    if (mimeType.includes('heic')) return 'heic';
    return 'jpg';
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

        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'Only image files are accepted' }, { status: 400 });
        }

        if (file.size > 8 * 1024 * 1024) {
            return NextResponse.json({ error: 'Image too large (max 8MB)' }, { status: 413 });
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
