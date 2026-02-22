import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export default async function OGImage(props: { params: Promise<{ slug: string }> }) {
    const params = await props.params;
    const name = decodeURIComponent(params.slug);

    const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000';

    let avgDelta = '?';
    let stopsCount = 0;
    let pctVerified = 0;

    try {
        const res = await fetch(`${baseUrl}/api/neighborhood/detail?name=${encodeURIComponent(name)}`, { cache: 'no-store' });
        if (res.ok) {
            const data = await res.json();
            avgDelta = data.summary?.avg_delta_min ?? '?';
            stopsCount = data.summary?.stops_count ?? 0;
            pctVerified = data.summary?.pct_verified_avg ?? 0;
        }
    } catch { /* fallback values */ }

    return new ImageResponse(
        (
            <div style={{
                background: 'linear-gradient(135deg, #18181b 0%, #09090b 50%, #000 100%)',
                width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
                justifyContent: 'center', padding: '80px', fontFamily: 'sans-serif',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
                    <span style={{ fontSize: '24px', fontWeight: 'bold', backgroundColor: '#facc15', padding: '6px 16px', borderRadius: '8px', color: 'black' }}>VR NO PONTO</span>
                    <span style={{ fontSize: '24px', color: '#9ca3af' }}>Diagnóstico de Bairro</span>
                </div>

                <h1 style={{ color: 'white', fontSize: '72px', fontWeight: '900', margin: '0 0 30px 0', lineHeight: 1.1 }}>
                    {name}
                </h1>

                <div style={{ display: 'flex', gap: '40px', marginTop: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '56px', fontWeight: '900', color: '#f97316' }}>+{avgDelta}min</span>
                        <span style={{ fontSize: '22px', color: '#9ca3af', marginTop: '8px' }}>Atraso médio</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '56px', fontWeight: '900', color: 'white' }}>{stopsCount}</span>
                        <span style={{ fontSize: '22px', color: '#9ca3af', marginTop: '8px' }}>Pontos monitorados</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '56px', fontWeight: '900', color: '#10b981' }}>{pctVerified}%</span>
                        <span style={{ fontSize: '22px', color: '#9ca3af', marginTop: '8px' }}>Verificado</span>
                    </div>
                </div>
            </div>
        ),
        { width: 1200, height: 630 }
    );
}
