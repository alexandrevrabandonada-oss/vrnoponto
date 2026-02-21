'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useDeviceId } from '@/hooks/useDeviceId';

// IDs mockados (vindos da migration 0002_seed.sql)
const MOCK_LINE_ID = '11111111-1111-1111-1111-111111111111';
const MOCK_STOP_ID = '22222222-2222-2222-2222-222222222222';

export default function NoPonto() {
    const deviceId = useDeviceId();
    const supabase = createClient();

    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [gpsStatus, setGpsStatus] = useState<string>('Solicitando GPS...');
    const [selectedStop, setSelectedStop] = useState(MOCK_STOP_ID);
    const [selectedLine, setSelectedLine] = useState(MOCK_LINE_ID);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');

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

    const handleArrived = async () => {
        if (!deviceId) return alert('Aguarde a geração do Device ID');
        setIsSubmitting(true);
        setMessage('');

        const { error } = await supabase.from('stop_events').insert({
            stop_id: selectedStop,
            line_id: selectedLine,
            device_id: deviceId,
            event_type: 'arrived',
            // occurred_at é preenchido pelo banco (default now())
        });

        setIsSubmitting(false);

        if (error) {
            setMessage('Erro ao registrar: ' + error.message);
        } else {
            setMessage('Presença registrada com sucesso!');
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

                {/* Seleção Manual (MVP) */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-200">Ponto Atual</label>
                        <select
                            value={selectedStop}
                            onChange={(e) => setSelectedStop(e.target.value)}
                            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            <option value={MOCK_STOP_ID}>Ponto Central (PT-001)</option>
                        </select>
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
