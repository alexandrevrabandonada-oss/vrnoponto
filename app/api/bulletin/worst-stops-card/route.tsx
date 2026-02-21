import { ImageResponse } from 'next/og';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

type WorstStop = {
    stop_id: string;
    stop_name: string;
    neighborhood: string;
    worst_delta_min: number;
    pct_verified_avg: number;
};

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const format = searchParams.get('format') || 'square';

        const width = format === 'story' ? 1080 : 1080;
        const height = format === 'story' ? 1920 : 1080;

        const supabase = await createClient();

        // Fetch top 3 worst stops
        const { data: stops } = await supabase
            .from('vw_worst_stops_30d')
            .select('*')
            .limit(3);

        const stopsRender = ((stops || []) as WorstStop[]).map((s: WorstStop, idx: number) => (
            <div key={idx} style={{
                display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255,255,255,0.05)',
                padding: '30px', borderRadius: '16px', marginBottom: '20px', borderLeft: '8px solid #ef4444'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '40px', fontWeight: 'bold', color: 'white' }}>{idx + 1}º. {s.stop_name}</span>
                        <span style={{ fontSize: '28px', color: '#9ca3af', marginTop: '10px' }}>{s.neighborhood}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ fontSize: '48px', fontWeight: '900', color: '#ef4444' }}>+{s.worst_delta_min} min</span>
                        <span style={{ fontSize: '20px', color: '#10b981', marginTop: '5px' }}>{s.pct_verified_avg}% Verificado</span>
                    </div>
                </div>
            </div>
        ));

        return new ImageResponse(
            (
                <div
                    style={{
                        background: 'linear-gradient(to bottom right, #0f172a, #000000)',
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '80px',
                        fontFamily: 'sans-serif',
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '60px' }}>
                        <span style={{ fontSize: '32px', fontWeight: 'bold', backgroundColor: '#4f46e5', padding: '10px 20px', borderRadius: '8px', color: 'white' }}>
                            VR NO PONTO
                        </span>
                        <span style={{ color: '#9ca3af', fontSize: '28px' }}>Boletim Semanal de Atrasos</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <h1 style={{ color: 'white', fontSize: '64px', fontWeight: '900', margin: '0 0 20px 0', lineHeight: 1.1 }}>
                            Pontos Mais Críticos
                        </h1>
                        <p style={{ color: '#9ca3af', fontSize: '32px', margin: '0 0 60px 0' }}>
                            Atrasos acima do horário oficial prometido (Últimos 30 dias).
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', flex: 1 }}>
                            {stopsRender.length > 0 ? stopsRender : <div style={{ color: 'white', fontSize: '30px' }}>Sem dados suficientes.</div>}
                        </div>
                    </div>
                </div>
            ),
            {
                width,
                height,
            }
        );
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        return new Response(`Failed to generate image: ${message}`, { status: 500 });
    }
}
