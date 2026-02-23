import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
        const { action, mutirao } = body;

        const supabase = await createClient();

        if (action === 'create') {
            const { data, error } = await supabase
                .from('mutiroes')
                .insert([{
                    slug: mutirao.slug,
                    title: mutirao.title,
                    description: mutirao.description,
                    goal: mutirao.goal,
                    is_active: mutirao.is_active || false
                }])
                .select()
                .single();

            if (error) throw error;
            return NextResponse.json({ success: true, mutirao: data });
        }

        if (action === 'toggle') {
            const { id, is_active } = mutirao;
            const { data, error } = await supabase
                .from('mutiroes')
                .update({ is_active })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return NextResponse.json({ success: true, mutirao: data });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
