import { ImageResponse } from 'next/og';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';
export const alt = 'Volta Redonda no Ponto - Análise de Confiabilidade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params: paramsPromise, request }: { params: Promise<{ id: string }>; request: Request }) {
    const params = await paramsPromise;
    const lineId = params.id;
    const { searchParams } = new URL(request.url);
    const dayGroup = searchParams.get('day') || 'WEEKDAY';

    const dayName = dayGroup === 'WEEKDAY' ? 'Dias Úteis' : dayGroup === 'SAT' ? 'Sábado' : 'Domingo';

    const supabase = await createClient();

    // Buscar info da linha
    const { data: line } = await supabase
        .from('lines')
        .select('code, name')
        .eq('id', lineId)
        .single();

    // Buscar view
    const { data: gaps } = await supabase
        .from('vw_line_promised_vs_real_30d')
        .select('*')
        .eq('line_id', lineId)
        .eq('day_group', dayGroup);

    if (!line || !gaps || gaps.length === 0) {
        return new ImageResponse(
            (
                <div style={{ background: 'white', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
                    <h1 style={{ fontSize: 60, fontWeight: 900, color: '#111827' }}>Volta Redonda no Ponto</h1>
                    <p style={{ fontSize: 40, color: '#4b5563', marginTop: 20 }}>Análise Indisponível</p>
                </div>
            )
        );
    }

    // Acha a pior hora do dia
    const worstHour = [...gaps]
        .filter(d => d.delta_pct !== null && d.samples >= 3)
        .sort((a, b) => (b.delta_pct || 0) - (a.delta_pct || 0))[0];

    return new ImageResponse(
        (
            <div style={{
                background: 'linear-gradient(to bottom right, #ffffff, #f9fafb)',
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                padding: '80px',
                fontFamily: 'sans-serif'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 32, fontWeight: 900, color: '#facc15', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
                            Volta Redonda no Ponto
                        </span>
                        <span style={{ fontSize: 48, fontWeight: 900, color: '#111827', marginTop: '10px' }}>
                            {line.code} - {line.name}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', background: '#fef3c7', padding: '16px 32px', borderRadius: '100px' }}>
                        <span style={{ fontSize: 30, fontWeight: 700, color: '#92400e' }}>{dayName}</span>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
                    <h1 style={{ fontSize: 96, fontWeight: 900, color: '#111827', margin: 0, lineHeight: 1.1, letterSpacing: '-0.03em' }}>
                        Prometido vs Real
                    </h1>

                    {worstHour ? (
                        <div style={{ display: 'flex', flexDirection: 'column', marginTop: '40px' }}>
                            <p style={{ fontSize: 40, color: '#4b5563', margin: 0, fontWeight: 500 }}>
                                Pior momento: <strong style={{ color: '#111827' }}>às {worstHour.hour}h</strong>.
                            </p>
                            <p style={{ fontSize: 40, color: '#4b5563', margin: 0, fontWeight: 500, marginTop: '20px' }}>
                                A prefeitura promete intervalo de <strong style={{ color: '#92400e' }}>{worstHour.promised_headway_min} minutos</strong>,
                            </p>
                            <p style={{ fontSize: 40, color: '#4b5563', margin: 0, fontWeight: 500, marginTop: '20px' }}>
                                mas a realidade é de <strong style={{ color: '#b91c1c' }}>{worstHour.real_p50_headway_min} minutos</strong>.
                            </p>
                            <div style={{ display: 'flex', marginTop: '40px', alignItems: 'center' }}>
                                <span style={{ fontSize: 64, fontWeight: 900, color: '#dc2626' }}>
                                    +{Math.round(worstHour.delta_pct!)}% de atraso
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', marginTop: '40px' }}>
                            <p style={{ fontSize: 40, color: '#4b5563', margin: 0, fontWeight: 500 }}>
                                Atrasos nos últimos 30 dias estão próximos da tabela oficial.
                            </p>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 24, color: '#6b7280', fontWeight: 600 }}>DADOS CROWDSOURCING E APURADOS (Últimos 30 Dias)</span>
                        <span style={{ fontSize: 24, color: '#9ca3af', marginTop: '8px' }}>Não representa informação em tempo real da PMVR</span>
                    </div>
                    {worstHour && (
                        <div style={{ display: 'flex', alignItems: 'center', background: '#d1fae5', padding: '12px 24px', borderRadius: '100px' }}>
                            <span style={{ fontSize: 24, fontWeight: 700, color: '#065f46' }}>
                                Amostra: {worstHour.samples} ({Math.round(worstHour.pct_verified)}% Nível Alto)
                            </span>
                        </div>
                    )}
                </div>
            </div>
        )
    );
}
