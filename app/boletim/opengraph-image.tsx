import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const alt = 'Boletim VR no Ponto - Auditoria Popular';
export const size = {
    width: 1200,
    height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get simple counts for the last 7 days
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - 7);

    const { data: alerts } = await supabase
        .from('alerts')
        .select('severity')
        .eq('is_active', true)
        .gte('created_at', thresholdDate.toISOString());

    const critCount = alerts?.filter(a => a.severity === 'CRIT').length || 0;
    const warnCount = alerts?.filter(a => a.severity === 'WARN').length || 0;

    return new ImageResponse(
        (
            <div style={{
                background: 'linear-gradient(to bottom, #18181b, #09090b)',
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'sans-serif',
                color: 'white',
                padding: '60px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
                    <div style={{ width: '30px', height: '30px', backgroundColor: '#facc15', borderRadius: '8px' }} />
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#94a3b8' }}>VR NO PONTO</div>
                </div>

                <div style={{ fontSize: '72px', fontWeight: '900', textAlign: 'center', marginBottom: '40px' }}>
                    BOLETIM DE <span style={{ color: '#facc15' }}>TRANSPARÊNCIA</span>
                </div>

                <div style={{ display: 'flex', gap: '40px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(239, 68, 68, 0.1)', padding: '20px 40px', borderRadius: '20px', border: '1px solid #ef4444' }}>
                        <div style={{ fontSize: '64px', fontWeight: 'bold', color: '#ef4444' }}>{critCount}</div>
                        <div style={{ fontSize: '20px', color: '#f87171' }}>Alertas Críticos</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(249, 115, 22, 0.1)', padding: '20px 40px', borderRadius: '20px', border: '1px solid #f97316' }}>
                        <div style={{ fontSize: '64px', fontWeight: 'bold', color: '#f97316' }}>{warnCount}</div>
                        <div style={{ fontSize: '20px', color: '#fb923c' }}>Avisos</div>
                    </div>
                </div>

                <div style={{ marginTop: '50px', fontSize: '24px', color: '#4b5563' }}>
                    Acompanhe em vrnoponto.vercel.app/boletim
                </div>
            </div>
        ),
        {
            ...size,
        }
    );
}
