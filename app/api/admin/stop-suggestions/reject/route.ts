import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    const token = request.nextUrl.searchParams.get('t')
        || request.headers.get('authorization')?.replace('Bearer ', '')
        || request.headers.get('x-admin-token');

    if (!token || token !== process.env.ADMIN_TOKEN) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { id, admin_note } = body as { id?: string; admin_note?: string };

        if (!id) {
            return NextResponse.json({ error: 'ID da sugestão é obrigatório' }, { status: 400 });
        }

        const supabase = await createClient();

        // Check suggestion exists and is PENDING
        const { data: suggestion, error: fetchError } = await supabase
            .from('stop_suggestions')
            .select('id, status')
            .eq('id', id)
            .single();

        if (fetchError || !suggestion) {
            return NextResponse.json({ error: 'Sugestão não encontrada' }, { status: 404 });
        }

        if (suggestion.status !== 'PENDING') {
            return NextResponse.json({ error: 'Sugestão já foi processada' }, { status: 409 });
        }

        const { error: updateError } = await supabase
            .from('stop_suggestions')
            .update({
                status: 'REJECTED',
                admin_note: admin_note?.trim() || null,
                decided_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (updateError) {
            console.error('reject suggestion update error:', updateError);
            return NextResponse.json({ error: 'Erro ao rejeitar sugestão' }, { status: 500 });
        }

        return NextResponse.json({ ok: true, message: 'Sugestão rejeitada' });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro interno';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
