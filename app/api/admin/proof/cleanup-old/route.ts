import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const BATCH_SIZE = 200;

function checkAdminToken(request: Request): boolean {
    const url = new URL(request.url);
    const queryToken = url.searchParams.get('t');
    const authToken = request.headers.get('authorization')?.replace('Bearer ', '');
    const token = queryToken || authToken;
    return !!token && token === process.env.ADMIN_TOKEN;
}

export async function POST(request: Request) {
    if (!checkAdminToken(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!supabaseUrl || !serviceKey) {
        return NextResponse.json({ error: 'Supabase env missing' }, { status: 500 });
    }

    try {
        const supabase = createClient(supabaseUrl, serviceKey);
        const cutoff14 = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
        const cutoff30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        const { data: rows, error } = await supabase
            .from('bus_photo_events')
            .select('id, photo_path')
            .or(`created_at.lt.${cutoff30},and(created_at.lt.${cutoff14},user_confirmed.eq.false,event_id.is.null)`)
            .limit(BATCH_SIZE);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!rows || rows.length === 0) {
            return NextResponse.json({
                ok: true,
                deleted_events: 0,
                deleted_files: 0,
                message: 'Nenhuma foto antiga para limpeza.'
            });
        }

        const paths = rows.map(r => r.photo_path).filter(Boolean);
        let deletedFiles = 0;
        if (paths.length > 0) {
            const { data: removed, error: removeErr } = await supabase.storage.from('proof').remove(paths);
            if (removeErr) {
                return NextResponse.json({ error: removeErr.message }, { status: 500 });
            }
            deletedFiles = removed?.length || 0;
        }

        const ids = rows.map(r => r.id);
        const { error: deleteErr } = await supabase
            .from('bus_photo_events')
            .delete()
            .in('id', ids);

        if (deleteErr) {
            return NextResponse.json({ error: deleteErr.message }, { status: 500 });
        }

        return NextResponse.json({
            ok: true,
            deleted_events: ids.length,
            deleted_files: deletedFiles,
            message: `Limpeza concluída: ${ids.length} registros e ${deletedFiles} arquivos removidos.`
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
