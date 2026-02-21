import { ImageResponse } from 'next/og';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

export default async function Image({ params }: { params: { id: string } }) {
    const supabase = await createClient();

    const { data: partner } = await supabase
        .from('partners')
        .select('name, neighborhood, category')
        .eq('id', params.id)
        .single();

    if (!partner) {
        return new ImageResponse(
            (
                <div style={{
                    fontSize: 48,
                    background: '#312e81',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                }}>
                    VR no Ponto
                </div>
            ),
            { width: 1200, height: 630 }
        );
    }

    return new ImageResponse(
        (
            <div
                style={{
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#fff',
                    backgroundImage: 'radial-gradient(circle at 25px 25px, #f1f5f9 2%, transparent 0%), radial-gradient(circle at 75px 75px, #f1f5f9 2%, transparent 0%)',
                    backgroundSize: '100px 100px',
                    padding: '80px',
                }}
            >
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#4f46e5',
                    borderRadius: '40px',
                    padding: '60px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    color: 'white',
                    width: '1000px',
                    border: '8px solid white',
                }}>
                    <div style={{
                        display: 'flex',
                        fontSize: '24px',
                        fontWeight: '900',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        padding: '10px 20px',
                        borderRadius: '12px',
                        marginBottom: '40px',
                    }}>
                        Ponto Parceiro Autorizado
                    </div>

                    <div style={{
                        fontSize: '72px',
                        fontWeight: '900',
                        textAlign: 'center',
                        lineHeight: '1.1',
                        marginBottom: '20px',
                    }}>
                        {partner.name}
                    </div>

                    <div style={{
                        display: 'flex',
                        fontSize: '32px',
                        fontWeight: '600',
                        opacity: 0.8,
                    }}>
                        {partner.neighborhood} • VR no Ponto
                    </div>
                </div>

                <div style={{
                    display: 'flex',
                    marginTop: '40px',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#475569',
                }}>
                    Auditoria Urbana Colaborativa • Valide sua presença L3 aqui
                </div>
            </div>
        ),
        {
            width: 1200,
            height: 630,
        }
    );
}
