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
    } catch {
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    if (!checkAdminToken(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { id, ids, action, admin_note } = body;

        if ((!id && !ids) || !['approve', 'reject'].includes(action)) {
            return NextResponse.json({ error: 'Ação ou ID(s) inválidos.' }, { status: 400 });
        }

        const supabase = await createClient();
        const targetIds = ids || [id];
        const results = [];

        for (const targetId of targetIds) {
            try {
                if (action === 'reject') {
                    const { error } = await supabase
                        .from('stop_suggestions')
                        .update({
                            status: 'REJECTED',
                            admin_note,
                            decided_at: new Date().toISOString()
                        })
                        .eq('id', targetId);

                    if (error) throw error;
                    results.push({ id: targetId, ok: true });
                } else {
                    // APPROVE
                    const { data: draft, error: fetchError } = await supabase
                        .from('stop_suggestions')
                        .select('*')
                        .eq('id', targetId)
                        .single();

                    if (fetchError || !draft) throw new Error('Rascunho não encontrado.');

                    // Get coordinates
                    const lng = draft.geom.coordinates[0];
                    const lat = draft.geom.coordinates[1];

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
                        await supabase
                            .from('stop_suggestions')
                            .update({
                                status: 'APPROVED',
                                admin_note: admin_note || `Criado via Operador (${createData.status})`,
                                decided_at: new Date().toISOString()
                            })
                            .eq('id', targetId);
                        results.push({ id: targetId, ok: true, status: createData.status });
                    } else {
                        results.push({ id: targetId, ok: false, error: createData.error });
                    }
                }
            } catch (itemErr: any) {
                results.push({ id: targetId, ok: false, error: itemErr.message });
            }
        }

        console.log(`[Telemetry] admin_bulk_action: ${action} x ${targetIds.length}`);
        revalidatePath('/admin/pontos');
        return NextResponse.json({ ok: true, results });

    } catch (err: unknown) {
        console.error('API /admin/stops/drafts:', err);
        return NextResponse.json({ error: 'Erro ao processar ação.' }, { status: 500 });
    }
}
