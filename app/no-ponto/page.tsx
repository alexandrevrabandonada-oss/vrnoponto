'use client';

import { useState, useEffect } from 'react';
import { useDeviceId } from '@/hooks/useDeviceId';

// IDs mockados (vindos da migration 0002_seed.sql)
const MOCK_LINE_ID = '11111111-1111-1111-1111-111111111111';

export default function NoPonto() {
    const deviceId = useDeviceId();

    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [gpsStatus, setGpsStatus] = useState<string>('Solicitando GPS...');
    const [nearestStops, setNearestStops] = useState<{ id: string, name: string, distance_m: number }[]>([]);

    const [selectedStop, setSelectedStop] = useState('');
    const [selectedLine, setSelectedLine] = useState(MOCK_LINE_ID); // Manteremos a linha mockada pro MVP
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [isLoadingStops, setIsLoadingStops] = useState(false);

    // Efeito para GPS
    useEffect(() => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    });
                    setGpsStatus('GPS Capturado 🎉');
                },
                (error) => {
                    setGpsStatus('Erro ao capturar GPS: ' + error.message);
                }
            );
        } else {
            queueMicrotask(() => setGpsStatus('Geolocalização não suportada neste navegador.'));
        }
    }, []);

    // Efeito para buscar pontos quando o GPS atualizar
    useEffect(() => {
        async function fetchStops() {
            if (!location) return;
            setIsLoadingStops(true);
            try {
                const res = await fetch(`/api/stops/nearest?lat=${location.lat}&lng=${location.lng}&lim=3`);
                if (res.ok) {
                    const data = await res.json();
                    setNearestStops(data.stops || []);
                    if (data.stops?.length > 0) {
                        setSelectedStop(data.stops[0].id); // Auto-seleciona o mais próximo
                    }
                }
            } catch (err) {
                console.error("Erro ao buscar pontos:", err);
            } finally {
                setIsLoadingStops(false);
            }
        }
        fetchStops();
    }, [location]);

    const handleArrived = async () => {
        if (!deviceId) return alert('Aguarde a geração do Device ID');
        setIsSubmitting(true);
        setMessage('');

        if (!selectedStop) {
            setMessage('Selecione um ponto primeiro.');
            return;
        }

        try {
            const res = await fetch('/api/events/record', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deviceId,
                    stopId: selectedStop,
                    lineId: selectedLine,
                    eventType: 'arrived'
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Erro desconhecido');
            }
            setMessage('Presença registrada com sucesso! Nível: ' + (data.event?.trust_level || 'L1'));
        } catch (err: unknown) {
            const errMessage = err instanceof Error ? err.message : 'Erro desconhecido';
            setMessage('Erro ao registrar: ' + errMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="flex min-h-screen flex-col items-center p-8 bg-gray-50 dark:bg-gray-900">
            <h1 className="text-3xl font-bold mb-6 text-indigo-600 dark:text-indigo-400">Estou no Ponto</h1>

            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
                {/* Status GPS */}
                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg text-sm">
                    <strong>Status do GPS:</strong> {gpsStatus}
                    {location && (
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Lat: {location.lat.toFixed(5)}, Lng: {location.lng.toFixed(5)}
                        </div>
                    )}
                </div>

                {/* Seleção de Parada Dinâmica */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-200">
                            Ponto Atual {isLoadingStops && <span className="text-xs text-indigo-500 animate-pulse">(Buscando...)</span>}
                        </label>

                        {nearestStops.length > 0 ? (
                            <select
                                value={selectedStop}
                                onChange={(e) => setSelectedStop(e.target.value)}
                                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                {nearestStops.map((stop) => (
                                    <option key={stop.id} value={stop.id}>
                                        {stop.name} (aprox. {stop.distance_m}m)
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <div className="p-4 border rounded-md bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-sm text-center">
                                {location ? (
                                    <>
                                        <p className="mb-2">Nenhum ponto de ônibus ativo localizado no seu perímetro atual.</p>
                                        <a href="/admin/pontos" className="font-bold underline">Sugerir Ponto / Cadastrar</a>
                                    </>
                                ) : (
                                    <p>Aguardando sua localização para listar pontos próximos.</p>
                                )}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-200">Linha Esperada</label>
                        <select
                            value={selectedLine}
                            onChange={(e) => setSelectedLine(e.target.value)}
                            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            <option value={MOCK_LINE_ID}>P200 - Vila Rica / Centro</option>
                        </select>
                    </div>
                </div>

                {/* Botão de Ação */}
                <button
                    onClick={handleArrived}
                    disabled={isSubmitting || !deviceId}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-3 px-4 rounded-lg transition-colors flex justify-center items-center"
                >
                    {isSubmitting ? 'Registrando...' : '📍 Cheguei no Ponto'}
                </button>

                {message && (
                    <div className={"p-3 rounded-lg text-center font-medium " + (message.includes('Erro') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700')}>
                        {message}
                    </div>
                )}
            </div>
        </main >
    );
}
