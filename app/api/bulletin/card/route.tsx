import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';
import { recordOneShot } from '@/lib/systemRuns';

export const runtime = 'edge';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const format = searchParams.get('format') || 'square';
        const days = parseInt(searchParams.get('days') || '7', 10);

        const isStory = format === 'story';
        const width = 1080;
        const height = isStory ? 1920 : 1080;

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - days);
        const isoThreshold = thresholdDate.toISOString();

        // 1. Alert Summary
        const { data: alertsData } = await supabase
            .from('alerts')
            .select('severity')
            .eq('is_active', true)
            .gte('created_at', isoThreshold);

        const counts = (alertsData || []).reduce((acc: Record<string, number>, curr: { severity: string }) => {
            acc[curr.severity] = (acc[curr.severity] || 0) + 1;
            return acc;
        }, { CRIT: 0, WARN: 0 });

        // 2. Worst Stoppage
        const { data: worstStopData } = await supabase
            .from('vw_stop_wait_30d')
            .select('stop_name, p50_wait_min')
            .not('p50_wait_min', 'is', null)
            .order('p50_wait_min', { ascending: false })
            .limit(1)
            .single();

        // 3. Worst Line (using 30d view or similar)
        // Note: For simplicity and speed in the Generator, we'll try to get the most representative line
        const { data: worstLineData } = await supabase
            .from('vw_line_headway_weekly')
            .select('line_id, p50_headway_min')
            .order('p50_headway_min', { ascending: false })
            .limit(1)
            .maybeSingle();

        const periodText = `Últimos ${days} dias (${thresholdDate.toLocaleDateString('pt-BR')} - ${new Date().toLocaleDateString('pt-BR')})`;

        recordOneShot('bulletin_card', 'OK', { format, days }).catch(() => { });

        return new ImageResponse(
            (
                <div style={{
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#1e1b4b', // Indigo 950
                    fontFamily: 'sans-serif',
                    color: 'white',
                    padding: isStory ? '80px 60px' : '60px',
                }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' }}>
                        <div style={{ width: '40px', height: '40px', backgroundColor: '#4f46e5', borderRadius: '10px' }} />
                        <div style={{ fontSize: '32px', fontWeight: 'bold' }}>VR no Ponto</div>
                    </div>

                    {/* Title */}
                    <div style={{
                        fontSize: isStory ? '86px' : '72px',
                        fontWeight: '900',
                        textAlign: 'center',
                        lineHeight: '1',
                        marginBottom: '20px',
                        letterSpacing: '-2px'
                    }}>
                        BOLETIM <br /> <span style={{ color: '#4f46e5' }}>SEMANAL</span>
                    </div>

                    <div style={{ fontSize: '24px', color: '#94a3b8', marginBottom: '60px' }}>
                        {periodText}
                    </div>

                    {/* Alert Grid */}
                    <div style={{ display: 'flex', width: '100%', gap: '30px', marginBottom: '60px' }}>
                        <div style={{
                            flex: 1,
                            backgroundColor: '#450a0a',
                            borderRadius: '30px',
                            padding: '30px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            border: '2px solid #ef4444'
                        }}>
                            <div style={{ fontSize: '86px', fontWeight: '900', color: '#ef4444' }}>{counts.CRIT}</div>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f87171' }}>Alertas CRIT</div>
                        </div>
                        <div style={{
                            flex: 1,
                            backgroundColor: '#431407',
                            borderRadius: '30px',
                            padding: '30px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            border: '2px solid #f97316'
                        }}>
                            <div style={{ fontSize: '86px', fontWeight: '900', color: '#f97316' }}>{counts.WARN}</div>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fb923c' }}>Alertas WARN</div>
                        </div>
                    </div>

                    {/* Top Issues */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                        gap: '20px',
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        padding: '40px',
                        borderRadius: '30px'
                    }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ fontSize: '20px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px' }}>Pior Ponto</div>
                            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{worstStopData?.stop_name || 'Nenhum crítico'}</div>
                            <div style={{ fontSize: '24px', color: '#ef4444', fontWeight: 'bold' }}>Wait P50: {worstStopData?.p50_wait_min || '--'} min</div>
                        </div>

                        <div style={{ width: '100%', height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />

                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ fontSize: '20px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px' }}>Pior Linha</div>
                            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>Linha {worstLineData?.line_id || '--'}</div>
                            <div style={{ fontSize: '24px', color: '#f97316', fontWeight: 'bold' }}>Headway: {worstLineData?.p50_headway_min || '--'} min</div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ fontSize: '20px', color: '#4f46e5', fontWeight: 'bold' }}>vrnoponto.vercel.app</div>
                        <div style={{ fontSize: '16px', color: '#4b5563', marginTop: '10px' }}>Dados baseados em auditoria popular colaborativa</div>
                    </div>
                </div>
            ),
            {
                width,
                height,
            }
        );
    } catch {
        recordOneShot('bulletin_card', 'FAIL', {}).catch(() => { });
        return new Response('Error generating card', { status: 500 });
    }
}
