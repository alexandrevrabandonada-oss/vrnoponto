import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

function checkAdminToken(request: NextRequest): boolean {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
        || request.headers.get('x-admin-token');
    return !!token && token === process.env.ADMIN_TOKEN;
}

export async function POST(request: NextRequest) {
    if (!checkAdminToken(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { label = 'Operador de Campo' } = body;

        // Generate a random secure token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // 24h life

        const supabase = await createClient(); // Service role via server client

        const { data, error } = await supabase
            .from('operator_tokens')
            .insert({
                token,
                label,
                expires_at: expiresAt.toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        // Base URL logic (fallback to localhost if env not set)
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const operatorLink = `${baseUrl}/operador/pontos?t=${token}`;

        return NextResponse.json({
            ok: true,
            token: data.token,
            expires_at: data.expires_at,
            link: operatorLink
        });

    } catch (err: unknown) {
        console.error('API /admin/operator/generate-token:', err);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
