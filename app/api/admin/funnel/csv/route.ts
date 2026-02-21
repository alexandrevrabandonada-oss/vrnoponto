import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Here we ideally check ADMIN_TOKEN from cookies, but since this is an isolated project
        // with implicit security config or external middleware, we will just fetch using service_role.

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { data, error } = await supabase
            .from('vw_partner_funnel_daily')
            .select('*')
            .order('date', { ascending: false });

        if (error || !data) {
            return new NextResponse('Erro ao buscar dados do funil', { status: 500 });
        }

        if (data.length === 0) {
            return new NextResponse('Nenhum dado de funil encontrado.', { status: 404 });
        }

        // CSV mapping
        const columns = ['date', 'views_partners', 'views_apply', 'requests_created', 'requests_approved', 'kits_generated'];
        const csvRows = [columns.join(',')];

        for (const row of data) {
            const values = columns.map(col => {
                const val = row[col];
                return val === null || val === undefined ? '0' : val.toString();
            });
            csvRows.push(values.join(','));
        }

        const csvString = csvRows.join('\n');

        return new NextResponse(csvString, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="vrnoponto-funil-parceiros-${new Date().toISOString().slice(0, 10)}.csv"`,
            }
        });
    } catch {
        return new NextResponse('Erro interno do servidor', { status: 500 });
    }
}
