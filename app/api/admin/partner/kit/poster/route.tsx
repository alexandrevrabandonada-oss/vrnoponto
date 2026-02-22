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
            .select('name, neighborhood')
            .eq('id', id)
            .single();

        if (!partner) return new Response('Not found', { status: 404 });

        const { data: qr } = await supabase
            .from('qr_checkins')
            .select('token_plain')
            .eq('partner_id', id)
            .eq('is_active', true)
            .maybeSingle();

        const qrToken = qr?.token_plain || 'demo';
        const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL
            ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
            : 'http://localhost:3000';
        const validationUrl = `${baseUrl}/qr/${qrToken}`;
        const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(validationUrl)}`;

        return new ImageResponse(
            (
                <div style={{
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    backgroundColor: 'white',
                    padding: '80px',
                    fontFamily: 'sans-serif',
                }}>
                    {/* Brand Header */}
                    < div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '20px',
                        marginBottom: '40px',
                    }
                    }>
                        <div style={
                            {
                                width: '40px',
                                height: '40px',
                                backgroundColor: '#facc15',
                                borderRadius: '10px',
                            }
                        }> </div>
                        < div style={{
                            fontSize: '32px',
                            fontWeight: 'bold',
                            color: '#09090b',
                        }}> VR no Ponto </div>
                    </div>

                    {/* Main Title */}
                    <div style={
                        {
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            marginBottom: '60px',
                        }
                    }>
                        <div style={
                            {
                                fontSize: '64px',
                                fontWeight: '950',
                                color: '#111827',
                                lineHeight: '1',
                            }
                        }> AUDITORIA </div>
                        < div style={{
                            fontSize: '64px',
                            fontWeight: '950',
                            color: '#facc15',
                            lineHeight: '1',
                        }}> CIDADÃ </div>
                        < div style={{
                            fontSize: '24px',
                            fontWeight: 'bold',
                            color: '#4b5563',
                            marginTop: '20px',
                            letterSpacing: '2px',
                        }}> VALIDE SUA PRESENÇA AQUI </div>
                    </div>

                    {/* QR Code Section */}
                    <div style={
                        {
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            backgroundColor: '#f8fafc',
                            padding: '40px',
                            borderRadius: '40px',
                            border: '2px solid #e2e8f0',
                        }
                    }>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        < img
                            src={qrImgUrl}
                            style={{ width: '400px', height: '400px' }}
                            alt="QR Code"
                        />
                        <div style={
                            {
                                marginTop: '30px',
                                fontSize: '20px',
                                fontWeight: 'bold',
                                color: '#334155',
                            }
                        }>
                            {partner.name} • {partner.neighborhood}
                        </div>
                    </div>

                    {/* Instructions */}
                    <div style={
                        {
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '20px',
                            marginTop: '60px',
                            width: '100%',
                        }
                    }>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#facc15' }}> 1. </div>
                            < div style={{ fontSize: '24px', color: '#111827' }}> Aponte a câmera do seu celular para o QR Code </div>
                        </div>
                        < div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#facc15' }}> 2. </div>
                            < div style={{ fontSize: '24px', color: '#111827' }}> Clique no link e aguarde a validação do GPS </div>
                        </div>
                        < div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#facc15' }}> 3. </div>
                            < div style={{ fontSize: '24px', color: '#111827' }}> Pronto! Seu relato ganhou prova de presença(L3) </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={
                        {
                            display: 'flex',
                            marginTop: 'auto',
                            fontSize: '18px',
                            color: '#94a3b8',
                            fontWeight: 'bold',
                        }
                    }>
                        vrnoponto.vercel.app
                    </div>
                </div>
            ),
            { width: 842, height: 1191 } // A4 roughly
        );
    } catch {
        return new Response('Error', { status: 500 });
    }
}
