import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function checkAdminToken(request: NextRequest): boolean {
    const token = request.nextUrl.searchParams.get('t')
        || request.headers.get('authorization')?.replace('Bearer ', '')
        || request.headers.get('x-admin-token');
    return !!token && token === process.env.ADMIN_TOKEN;
}

export async function GET(request: NextRequest) {
    if (!checkAdminToken(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = request.nextUrl.searchParams.get('status') || 'PENDING';

    try {
        const supabase = await createClient();

        let query = supabase
            .from('stop_suggestions')
            .select('*')
            .eq('status', status);

        // Sort PENDING by most confirmed first
        if (status === 'PENDING') {
            query = query.order('confirmations', { ascending: false }).order('created_at', { ascending: false });
        } else {
            query = query.order('created_at', { ascending: false });
        }

        const { data, error } = await query;

        if (error) {
            console.error('GET /api/admin/stop-suggestions error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ suggestions: data || [] });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro interno';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
