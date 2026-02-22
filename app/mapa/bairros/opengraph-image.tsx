import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export default async function OGImage() {
    const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000';

    let top3: { neighborhood: string; avg_delta_min: number; pct_verified_avg: number }[] = [];
    try {
        const res = await fetch(`${baseUrl}/api/map/neighborhoods?limit=3`, { cache: 'no-store' });
        if (res.ok) {
            const json = await res.json();
            top3 = (json.data || []).sort((a: { avg_delta_min: number }, b: { avg_delta_min: number }) => b.avg_delta_min - a.avg_delta_min).slice(0, 3);
        }
    } catch { /* fallback */ }

    return new ImageResponse(
        (
            <div style={{
                background: 'linear-gradient(135deg, #18181b 0%, #09090b 50%, #000 100%)',
                width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
                justifyContent: 'center', padding: '80px', fontFamily: 'sans-serif',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
                    <span style={{ fontSize: '24px', fontWeight: 'bold', backgroundColor: '#facc15', padding: '6px 16px', borderRadius: '8px', color: 'black' }}>VR NO PONTO</span>
                    <span style={{ fontSize: '24px', color: '#9ca3af' }}>Mapa de Bairros</span>
                </div>
                <h1 style={{ color: 'white', fontSize: '64px', fontWeight: '900', margin: '0 0 30px 0', lineHeight: 1.1 }}>
                    Bairros Mais Críticos
                </h1>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {top3.map((n, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: '20px 28px', borderRadius: '12px', borderLeft: '6px solid #f97316' }}>
                            <span style={{ fontSize: '32px', fontWeight: 'bold', color: 'white' }}>{i + 1}º {n.neighborhood}</span>
                            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                                <span style={{ fontSize: '36px', fontWeight: '900', color: '#ef4444' }}>+{n.avg_delta_min}m</span>
                                <span style={{ fontSize: '18px', color: '#10b981' }}>{n.pct_verified_avg}% ✓</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        ),
        { width: 1200, height: 630 }
    );
}
