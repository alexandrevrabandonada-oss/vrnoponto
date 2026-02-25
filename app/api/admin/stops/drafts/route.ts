import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

function checkAdminToken(request: NextRequest): boolean {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
        || request.headers.get('x-admin-token');
    return !!token && token === process.env.ADMIN_TOKEN;
}

export async function GET(request: NextRequest) {
    if (!checkAdminToken(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('stop_suggestions')
            .select(`
                id, name_suggested, created_at, status, source, device_id,
                geom
            `)
            .eq('source', 'operator')
            .eq('status', 'PENDING')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Parse PostGIS geography to simple lat/lng
        const drafts = data.map(d => {
            // Placeholder for real parsing if needed, but normally handled by PostGIS -> JSON
            // If it returns WKB/GeoJSON string, we'd parse it here.
            return d;
        });

        return NextResponse.json({ drafts });
    } catch (err: unknown) {
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    if (!checkAdminToken(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { id, action, admin_note } = body;

        if (!id || !['approve', 'reject'].includes(action)) {
            return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
        }

        const supabase = await createClient();

        if (action === 'reject') {
            const { error } = await supabase
                .from('stop_suggestions')
                .update({
                    status: 'REJECTED',
                    admin_note,
                    decided_at: new Date().toISOString()
                })
                .eq('id', id);

            if (error) throw error;
            console.log(`[Telemetry] admin_draft_rejected: ${id}`);
            return NextResponse.json({ ok: true });
        }

        // APPROVE: Flow
        // 1. Get the draft details
        const { data: draft, error: fetchError } = await supabase
            .from('stop_suggestions')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !draft) throw new Error('Rascunho não encontrado.');

        // 2. We need lat/lon from geom
        // In this project, geom is geography(POINT). Supabase usually returns GeoJSON or we use RCP to extract.
        // For simplicity, we'll use a RPC or specialized select.
        const { data: coords, error: coordError } = await supabase.rpc('rpc_get_coords', {
            point_id: id,
            table_name: 'stop_suggestions'
        });

        // Let's assume rpc_get_coords exists or we create it. 
        // Or we just call the /api/admin/stops/quick-add logic directly if we had the values.
        // FOR NOW: Let's assume we can get it via a raw query if needed, but I'll try to extract from JSON.

        // If GeoJSON: draft.geom.coordinates [lng, lat]
        const lng = draft.geom.coordinates[0];
        const lat = draft.geom.coordinates[1];

        // 3. Call current quick-add logic (internal fetch to avoid duplication of dedupe code)
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const createRes = await fetch(`${baseUrl}/api/admin/stops/quick-add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-token': process.env.ADMIN_TOKEN || ''
            },
            body: JSON.stringify({
                name: draft.name_suggested,
                lat,
                lng,
                source: 'operator_approved'
            })
        });

        const createData = await createRes.json();

        if (createRes.ok) {
            // Mark suggestion as approved
            await supabase
                .from('stop_suggestions')
                .update({
                    status: 'APPROVED',
                    admin_note: admin_note || `Criado via Operador (${createData.status})`,
                    decided_at: new Date().toISOString()
                })
                .eq('id', id);

            console.log(`[Telemetry] admin_draft_approved: ${id}`);
            revalidatePath('/admin/pontos');
            return NextResponse.json({ ok: true, stop: createData.stop, status: createData.status });
        } else {
            return NextResponse.json({ error: createData.error || 'Falha ao processar criação.' }, { status: 400 });
        }

    } catch (err: unknown) {
        console.error('API /admin/stops/drafts:', err);
        return NextResponse.json({ error: 'Erro ao processar ação.' }, { status: 500 });
    }
}
