import { ImageResponse } from 'next/og';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return new Response('Missing ID', { status: 400 });

        const supabase = await createClient();
        const { data: partner } = await supabase
            .from('partners')
            .select('name, category')
            .eq('id', id)
            .single();

        if (!partner) return new Response('Not found', { status: 404 });

        return new ImageResponse(
            (
                <div style={{
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#fff',
                    padding: '40px',
                }}>
                    <div style={
                        {
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '520px',
                            height: '520px',
                            borderRadius: '50%',
                            border: '20px solid #4f46e5',
                            backgroundColor: 'white',
                            position: 'relative',
                        }
                    }>
                        <div style={
                            {
                                display: 'flex',
                                position: 'absolute',
                                top: '60px',
                                fontSize: '24px',
                                fontWeight: '900',
                                color: '#4f46e5',
                                letterSpacing: '4px',
                                textTransform: 'uppercase',
                            }
                        }>
                            Parceiro Verificado
                        </div>

                        < div style={{
                            display: 'flex',
                            fontSize: '48px',
                            fontWeight: '900',
                            textAlign: 'center',
                            color: '#1e1b4b',
                            marginTop: '20px',
                            maxWidth: '400px',
                            lineHeight: '1.1',
                        }
                        }>
                            {partner.name}
                        </div>

                        < div style={{
                            display: 'flex',
                            position: 'absolute',
                            bottom: '80px',
                            backgroundColor: '#4f46e5',
                            color: 'white',
                            padding: '10px 30px',
                            borderRadius: '100px',
                            fontSize: '20px',
                            fontWeight: 'bold',
                        }}>
                            VR no Ponto
                        </div>
                    </div>
                </div>
            ),
            { width: 600, height: 600 }
        );
    } catch (_err) {
        return new Response('Error', { status: 500 });
    }
}
