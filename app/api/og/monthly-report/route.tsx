import { ImageResponse } from 'next/og';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

function formatMonthLabel(yyyyMM: string) {
    if (!/^\d{4}-\d{2}$/.test(yyyyMM)) return 'Este mês';
    const [y, m] = yyyyMM.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1, 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);

        const now = new Date();
        const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const monthParam = searchParams.get('month') || defaultMonth;
        const dbMonth = `${monthParam}-01`;

        const supabase = await createClient();

        // Fetch Top 1 Ponto
        const { data: topStops } = await supabase
            .from('vw_monthly_summary_stops')
            .select('stop_name, p50_wait_min')
            .eq('report_month', dbMonth)
            .order('p50_wait_min', { ascending: false })
            .limit(1);

        // Fetch Top 1 Linha
        const { data: topLines } = await supabase
            .from('vw_monthly_summary_lines')
            .select('line_code, line_name, p50_headway_min')
            .eq('report_month', dbMonth)
            .order('p50_headway_min', { ascending: false })
            .limit(1);

        const stop = topStops && topStops.length > 0 ? topStops[0] : null;
        const line = topLines && topLines.length > 0 ? topLines[0] : null;
        const monthLabel = formatMonthLabel(monthParam);

        return new ImageResponse(
            (
                <div
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        justifyContent: 'center',
                        backgroundColor: '#111827', // gray-900
                        padding: '60px 80px',
                        fontFamily: 'sans-serif',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                        <div style={{ backgroundColor: '#4f46e5', width: '32px', height: '32px', borderRadius: '8px', marginRight: '16px' }}></div>
                        <h2 style={{ color: '#818cf8', fontSize: 32, fontWeight: 700, margin: 0, letterSpacing: '-0.05em' }}>
                            VR no Ponto <span style={{ color: '#4b5563', margin: '0 12px' }}>|</span> <span style={{ color: '#d1d5db' }}>Dados Abertos</span>
                        </h2>
                    </div>

                    <h1 style={{ color: '#ffffff', fontSize: 72, fontWeight: 900, lineHeight: 1.1, marginBottom: '60px', letterSpacing: '-0.05em' }}>
                        Relatório Mensal de Mobilidade<br />
                        <span style={{ color: '#4f46e5' }}>{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</span>
                    </h1>

                    <div style={{ display: 'flex', width: '100%', gap: '40px' }}>
                        {/* Box Ponto */}
                        <div style={{
                            display: 'flex', flexDirection: 'column', backgroundColor: '#1f2937', padding: '40px',
                            borderRadius: '24px', flex: 1, borderTop: '6px solid #ef4444'
                        }}>
                            <span style={{ color: '#9ca3af', fontSize: 24, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ponto + Crítico</span>
                            <span style={{ color: '#ffffff', fontSize: 42, fontWeight: 800, marginTop: '16px', lineHeight: 1.2 }}>
                                {stop ? stop.stop_name : 'Sem dados'}
                            </span>
                            <span style={{ color: '#ef4444', fontSize: 36, fontWeight: 900, marginTop: '16px' }}>
                                {stop ? `${stop.p50_wait_min} min de espera` : '--'}
                            </span>
                        </div>

                        {/* Box Linha */}
                        <div style={{
                            display: 'flex', flexDirection: 'column', backgroundColor: '#1f2937', padding: '40px',
                            borderRadius: '24px', flex: 1, borderTop: '6px solid #f59e0b'
                        }}>
                            <span style={{ color: '#9ca3af', fontSize: 24, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Linha + Irregular</span>
                            <div style={{ display: 'flex', alignItems: 'center', marginTop: '16px', gap: '12px' }}>
                                <span style={{ backgroundColor: '#374151', color: '#ffffff', padding: '8px 16px', borderRadius: '12px', fontSize: 28, fontWeight: 800 }}>
                                    {line ? line.line_code : '?'}
                                </span>
                                <span style={{ color: '#ffffff', fontSize: 36, fontWeight: 800, lineHeight: 1.2 }}>
                                    {line ? line.line_name : 'Sem dados'}
                                </span>
                            </div>
                            <span style={{ color: '#f59e0b', fontSize: 36, fontWeight: 900, marginTop: '16px' }}>
                                {line ? `${line.p50_headway_min} min intervalo` : '--'}
                            </span>
                        </div>
                    </div>

                    <div style={{ position: 'absolute', bottom: '60px', right: '80px', color: '#6b7280', fontSize: 28, fontWeight: 600 }}>
                        vrnoponto.vercel.app/relatorio/mensal
                    </div>
                </div>
            ),
            {
                width: 1200,
                height: 630,
            }
        );
    } catch {
        return new Response(`Failed to generate the image`, { status: 500 });
    }
}
