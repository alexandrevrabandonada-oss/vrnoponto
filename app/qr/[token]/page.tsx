'use client';

import { useEffect, useState, use } from 'react';
import { Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function QRCheckinPage(props: { params: Promise<{ token: string }> }) {
    const params = use(props.params);
    const [status, setStatus] = useState<'loading' | 'locating' | 'validating' | 'success' | 'error'>('loading');
    const [error, setError] = useState<string | null>(null);
    const [anchorName, setAnchorName] = useState<string | null>(null);
    const [anchorType, setAnchorType] = useState<'STOP' | 'PARTNER' | null>(null);

    useEffect(() => {
        async function validate(deviceId: string, lat: number, lng: number) {
            setStatus('validating');
            try {
                const res = await fetch('/api/qr/validate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: params.token, device_id: deviceId, lat, lng })
                });
                const data = await res.json();

                if (res.ok) {
                    setAnchorName(data.anchor_name);
                    setAnchorType(data.anchor_type);
                    setStatus('success');
                } else {
                    setError(data.error || 'Falha na validação');
                    setStatus('error');
                }
            } catch {
                setError('Erro de conexão com o servidor.');
                setStatus('error');
            }
        }

        async function startValidation() {
            const deviceId = localStorage.getItem('device_id');
            if (!deviceId) {
                setError('Device ID não encontrado. Relate algo primeiro.');
                setStatus('error');
                return;
            }

            setStatus('locating');

            if (!navigator.geolocation) {
                setError('Geolocalização não suportada no seu navegador.');
                setStatus('error');
                return;
            }

            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const { latitude: lat, longitude: lng } = pos.coords;
                    validate(deviceId, lat, lng);
                },
                () => {
                    setError('Precisamos da sua localização para validar a presença no ponto.');
                    setStatus('error');
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        }

        startValidation();
    }, [params.token]);


    return (
        <main className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
            <div className="max-w-xs w-full space-y-8">
                {status === 'loading' || status === 'locating' || status === 'validating' ? (
                    <div className="space-y-6">
                        <div className="flex justify-center">
                            <Loader2 className="animate-spin text-brand" size={64} />
                        </div>
                        <h1 className="text-2xl font-black text-white leading-tight font-industrial uppercase tracking-tight">
                            {status === 'locating' ? 'Localizando você...' : 'Validando presença...'}
                        </h1>
                        <p className="text-gray-500 font-medium">
                            Aguarde enquanto confirmamos sua localização no ponto.
                        </p>
                    </div>
                ) : status === 'success' ? (
                    <div className="space-y-6 animate-in fade-in zoom-in duration-500">
                        <div className="flex justify-center">
                            <div className="bg-emerald-100 p-6 rounded-full">
                                <ShieldCheck className="text-emerald-600" size={64} />
                            </div>
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 leading-tight">
                            Presença Confirmada!
                        </h1>
                        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
                            <div className="text-[10px] text-emerald-600 uppercase font-black mb-1 bg-emerald-100/50 inline-block px-2 py-0.5 rounded tracking-wider">
                                {anchorType === 'PARTNER' ? 'PONTO PARCEIRO' : 'PONTO DE ÔNIBUS'}
                            </div>
                            <p className="text-emerald-800 font-bold text-lg leading-tight mt-1">
                                {anchorName}
                            </p>
                            <p className="text-emerald-600/70 text-xs mt-1 font-bold">Confiabilidade L3 Ativada</p>
                        </div>
                        <p className="text-gray-500 text-sm leading-relaxed">
                            Seu relato recente foi promovido para Prova Forte. Obrigado por colaborar!
                        </p>
                        <Link
                            href="/mapa"
                            className="block w-full bg-gray-900 text-white py-4 rounded-2xl font-black shadow-xl shadow-gray-200 active:scale-95 transition-transform"
                        >
                            Ver Mapa de Atrasos
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-center">
                            <div className="bg-red-50 p-6 rounded-full text-red-500">
                                <AlertCircle size={64} />
                            </div>
                        </div>
                        <h1 className="text-2xl font-black text-gray-900 leading-tight">
                            Ops! Algo deu errado.
                        </h1>
                        <p className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold border border-red-100">
                            {error}
                        </p>

                        <div className="space-y-3">
                            <button
                                onClick={() => window.location.reload()}
                                className="block w-full bg-gray-900 text-white py-4 rounded-2xl font-black shadow-xl shadow-gray-100"
                            >
                                Tentar novamente
                            </button>
                            <Link
                                href="/registrar"
                                className="block w-full bg-white text-gray-500 py-3 rounded-2xl font-bold hover:text-gray-700"
                            >
                                Voltar ao Início
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
