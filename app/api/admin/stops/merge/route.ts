import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const { fromStopId, toStopId, reason } = await req.json();

        if (!fromStopId || !toStopId) {
            return NextResponse.json({ error: 'fromStopId and toStopId are required' }, { status: 400 });
        }

        if (fromStopId === toStopId) {
            return NextResponse.json({ error: 'Cannot merge a stop into itself' }, { status: 400 });
        }

        const supabase = await createClient();

        // Check if both stops exist
        const { data: stops, error: fetchError } = await supabase
            .from('stops')
            .select('id, name')
            .in('id', [fromStopId, toStopId]);

        if (fetchError || !stops || stops.length < 2) {
            return NextResponse.json({ error: 'One or both stops not found' }, { status: 404 });
        }

        // Call our transactional RPC
        const { data, error: rpcError } = await supabase.rpc('merge_stops', {
            from_stop_id: fromStopId,
            to_stop_id: toStopId,
            reason: reason || 'Administrativo (Mesclagem de duplicados)'
        });

        if (rpcError) {
            console.error('Merge RPC Error:', rpcError);
            return NextResponse.json({ error: rpcError.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            summary: data
        });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
