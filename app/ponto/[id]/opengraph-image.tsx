import { ImageResponse } from 'next/og';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';
export const alt = 'VR no Ponto - Auditoria do Ponto';
export const size = {
    width: 1200,
    height: 630,
};

export const contentType = 'image/png';

export default async function Image({ params }: { params: { id: string } }) {
    const supabase = await createClient();

    // Busca dados básicos do ponto
    const { data: stop } = await supabase
        .from('stops')
        .select('name')
        .eq('id', params.id)
        .single();

    // Busca métricas
    const { data: metrics } = await supabase
        .from('vw_stop_wait_30d')
        .select('p50_wait_min, samples')
        .eq('stop_id', params.id)
        .single();

    const stopName = stop?.name || 'Ponto de Ônibus';
    const p50 = metrics?.p50_wait_min ? `${metrics.p50_wait_min}m` : '--';
    const samples = metrics?.samples || 0;

    return new ImageResponse(
        (
            <div
                style={{
                    background: 'linear-gradient(to bottom, #1e293b, #0f172a)',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'sans-serif',
                    color: 'white',
                    padding: '40px',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                    <div style={{ background: '#ef4444', padding: '10px 20px', borderRadius: '8px', fontSize: '24px', fontWeight: 'bold' }}>
                        AUDITORIA POPULAR
                    </div>
                </div>

                <div style={{ fontSize: '64px', fontWeight: 'bold', textAlign: 'center', marginBottom: '40px', maxWidth: '1000px' }}>
                    {stopName}
                </div>

                <div style={{ display: 'flex', gap: '40px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ fontSize: '24px', color: '#94a3b8' }}>Espera Mediana</div>
                        <div style={{ fontSize: '96px', fontWeight: '900', color: '#fbbf24' }}>{p50}</div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: '2px', height: '100px', background: '#334155' }} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ fontSize: '24px', color: '#94a3b8' }}>Amostras</div>
                        <div style={{ fontSize: '96px', fontWeight: '900' }}>{samples}</div>
                    </div>
                </div>

                <div style={{ marginTop: '40px', fontSize: '32px', color: '#64748b', fontWeight: 'bold' }}>
                    VR no Ponto - Transparência Cidadã
                </div>
            </div>
        ),
        {
            ...size,
        }
    );
}
