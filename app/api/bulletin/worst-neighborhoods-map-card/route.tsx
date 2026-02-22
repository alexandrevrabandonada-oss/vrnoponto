import { ImageResponse } from 'next/og';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

type Row = { neighborhood: string; avg_delta_min: number; stops_count: number; samples_total: number; pct_verified_avg: number };

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const format = searchParams.get('format') || 'square';
        const limit = parseInt(searchParams.get('limit') || '5', 10);

        const width = format === 'story' ? 1080 : 1080;
        const height = format === 'story' ? 1920 : 1080;

        const supabase = await createClient();
        const { data } = await supabase.from('vw_neighborhood_map_30d').select('*').order('avg_delta_min', { ascending: false }).limit(limit);

        const rows = ((data || []) as Row[]).map((n: Row, idx: number) => (
            <div key={idx} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                backgroundColor: 'rgba(255,255,255,0.05)', padding: '22px 28px',
                borderRadius: '12px', marginBottom: '12px', borderLeft: '6px solid #f97316'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ fontSize: '32px', fontWeight: '900', color: '#f97316' }}>{idx + 1}º</span>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '28px', fontWeight: 'bold', color: 'white' }}>{n.neighborhood}</span>
                        <span style={{ fontSize: '18px', color: '#9ca3af', marginTop: '2px' }}>{n.stops_count} pontos · {n.samples_total} amostras</span>
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '36px', fontWeight: '900', color: '#ef4444' }}>+{n.avg_delta_min}m</span>
                    <span style={{ fontSize: '16px', color: '#10b981', marginTop: '2px' }}>{n.pct_verified_avg}% verificado</span>
                </div>
            </div>
        ));

        return new ImageResponse(
            (
                <div style={{
                    background: 'linear-gradient(to bottom right, #18181b, #000)', width: '100%', height: '100%',
                    display: 'flex', flexDirection: 'column', padding: '60px', fontFamily: 'sans-serif',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                        <span style={{ fontSize: '26px', fontWeight: 'bold', backgroundColor: '#facc15', padding: '8px 16px', borderRadius: '8px', color: 'black' }}>VR NO PONTO</span>
                        <span style={{ color: '#9ca3af', fontSize: '22px' }}>Mapa Semanal de Bairros</span>
                    </div>
                    <h1 style={{ color: 'white', fontSize: '48px', fontWeight: '900', margin: '0 0 12px 0' }}>Top {limit} Bairros — Atraso no Mapa</h1>
                    <p style={{ color: '#9ca3af', fontSize: '24px', margin: '0 0 30px 0' }}>Prometido vs Real (30 dias)</p>
                    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', flex: 1 }}>
                        {rows.length > 0 ? rows : <div style={{ color: 'white', fontSize: '24px' }}>Sem dados.</div>}
                    </div>
                </div>
            ),
            { width, height }
        );
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return new Response(`Failed: ${msg}`, { status: 500 });
    }
}
