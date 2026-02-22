import { ImageResponse } from 'next/og';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'square';

    const width = format === 'story' ? 1080 : 1200;
    const height = format === 'story' ? 1920 : 1200;

    const supabase = await createClient();

    // Get current month and previous month
    const { data: changes, error } = await supabase
        .from('vw_neighborhood_monthly_change')
        .select('*')
        .order('month_start', { ascending: false })
        .limit(100);

    if (error || !changes || changes.length === 0) {
        return new Response('No data found', { status: 404 });
    }

    // Filter for the latest month in the data
    const latestMonth = changes[0].month_start;
    const currentMonthData = changes.filter(c => c.month_start === latestMonth);

    const worsening = [...currentMonthData]
        .filter(c => c.delta_change_min !== null && c.delta_change_min > 0)
        .sort((a, b) => (b.delta_change_min || 0) - (a.delta_change_min || 0))
        .slice(0, 5);

    const improving = [...currentMonthData]
        .filter(c => c.delta_change_min !== null && c.delta_change_min < 0)
        .sort((a, b) => (a.delta_change_min || 0) - (b.delta_change_min || 0))
        .slice(0, 3);

    const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
        .format(new Date(latestMonth + 'T12:00:00Z'))
        .toUpperCase();

    return new ImageResponse(
        (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#030712',
                    padding: format === 'story' ? '80px 60px' : '60px',
                    color: 'white',
                    fontFamily: 'sans-serif',
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ backgroundColor: '#ef4444', color: 'white', padding: '6px 12px', borderRadius: '4px', fontSize: '20px', fontWeight: '900', width: 'fit-content', marginBottom: '12px' }}>
                            BOLETIM VR NO PONTO
                        </span>
                        <h1 style={{ fontSize: '48px', fontWeight: '900', margin: 0, textTransform: 'uppercase' }}>
                            Mudanças de Desempenho
                        </h1>
                        <span style={{ fontSize: '24px', color: '#9ca3af', fontWeight: 'bold' }}>{monthLabel}</span>
                    </div>
                    <div style={{ backgroundColor: '#1f2937', padding: '16px', borderRadius: '12px', display: 'flex' }}>
                        <span style={{ fontSize: '32px', fontWeight: '900', color: '#6366f1' }}>VRNP</span>
                    </div>
                </div>

                {/* Worsening Section */}
                <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '40px' }}>
                    <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#ef4444', marginBottom: '20px', display: 'flex', alignItems: 'center' }}>
                        ⚠️ MAIOR PIORA (Aumento no Atraso)
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {worsening.map((b, i) => (
                            <div key={b.neighborhood_norm} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderLeft: '8px solid #ef4444', padding: '20px', borderRadius: '8px' }}>
                                <span style={{ fontSize: '24px', fontWeight: 'bold' }}>{i + 1}. {b.neighborhood_norm}</span>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                    <span style={{ fontSize: '22px', fontWeight: '900', color: '#ef4444' }}>+{b.delta_change_min} min</span>
                                    <span style={{ fontSize: '14px', color: '#9ca3af' }}>vs mês anterior</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Improving Section */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#10b981', marginBottom: '20px', display: 'flex', alignItems: 'center' }}>
                        ✅ MELHOROU (Redução no Atraso)
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {improving.map((b, i) => (
                            <div key={b.neighborhood_norm} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderLeft: '8px solid #10b981', padding: '20px', borderRadius: '8px' }}>
                                <span style={{ fontSize: '24px', fontWeight: 'bold' }}>{i + 1}. {b.neighborhood_norm}</span>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                    <span style={{ fontSize: '22px', fontWeight: '900', color: '#10b981' }}>{b.delta_change_min} min</span>
                                    <span style={{ fontSize: '14px', color: '#9ca3af' }}>vs mês anterior</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '2px solid #1f2937', paddingTop: '30px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '18px', color: '#9ca3af' }}>Dados baseados em auditoria popular</span>
                        <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'white' }}>vrnoponto.com.br</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ef4444' }}></div>
                        <span style={{ fontWeight: 'bold' }}>REALIDADE OBSERVADA</span>
                    </div>
                </div>
            </div>
        ),
        {
            width,
            height,
        }
    );
}
