'use client';

import { useState } from 'react';
// SUPABASE CLIENT DELETED
import { useDeviceId } from '@/hooks/useDeviceId';
import { RatingModal } from '@/components/RatingModal';
import { QRScanner } from '@/components/QRScanner';
import { ShieldCheck, QrCode } from 'lucide-react';
import { HelpModal } from '@/components/HelpModal';

const MOCK_LINE_ID = '11111111-1111-1111-1111-111111111111';
const MOCK_STOP_ID = '22222222-2222-2222-2222-222222222222';

export default function Registrar() {
    const deviceId = useDeviceId();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [lastTrust, setLastTrust] = useState<string | null>(null);
    const [lastMethod, setLastMethod] = useState<string | null>(null);

    const registerEvent = async (eventType: string) => {
        if (!deviceId) return alert('Device ID não pronto');

        setIsSubmitting(true);
        setMessage('');
        setLastTrust(null);
        setLastMethod(null);

        try {
            const res = await fetch('/api/events/record', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deviceId,
                    stopId: MOCK_STOP_ID,
                    lineId: MOCK_LINE_ID,
                    eventType
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Erro desconhecido');
            }

            const trust = data.event?.trust_level || 'L1';
            const method = data.event?.trust_method || 'L1';
            setLastTrust(trust);
            setLastMethod(method);

            let successMsg = "Relato enviado!";
            if (trust === 'L2') successMsg = "Confirmado pela comunidade! (L2)";
            if (trust === 'L3') successMsg = `Prova Forte ativada via ${method}! (L3)`;

            setMessage(successMsg);

            if (eventType === 'boarding' || eventType === 'passed_by') {
                setIsModalOpen(true);
            }
        } catch (err: unknown) {
            const errMessage = err instanceof Error ? err.message : 'Erro desconhecido';
            setMessage('Erro ao registrar: ' + errMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="flex min-h-screen flex-col items-center p-8 bg-gray-50 dark:bg-gray-900">
            <h1 className="text-3xl font-bold mb-6 text-indigo-600 dark:text-indigo-400">Registrar Ação</h1>

            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 p-4 rounded-lg text-sm mb-6 border border-blue-200 dark:border-blue-800">
                    Você está simulando o ponto <strong>Centro (PT-001)</strong>, linha <strong>P200 - Vila Rica</strong>.
                </div>

                <div className="grid grid-cols-1 gap-3">
                    <button
                        onClick={() => registerEvent('passed_by')}
                        disabled={isSubmitting || !deviceId}
                        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-4 px-4 rounded-xl shadow-md transition-all active:scale-95"
                    >
                        🚌 Ônibus Passou Agora
                    </button>

                    <button
                        onClick={() => registerEvent('boarding')}
                        disabled={isSubmitting || !deviceId}
                        className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-4 px-4 rounded-xl shadow-md transition-all active:scale-95"
                    >
                        ✅ Entrei (Embarquei)
                    </button>

                    <button
                        onClick={() => registerEvent('alighted')}
                        disabled={isSubmitting || !deviceId}
                        className="w-full bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white font-bold py-4 px-4 rounded-xl shadow-md transition-all active:scale-95"
                    >
                        🚶 Desci (Aqui ou em outro ponto)
                    </button>
                </div>

                {message && (
                    <div className={"mt-4 p-4 rounded-xl text-center font-bold flex flex-col items-center justify-center gap-1 " + (message.includes('Erro') ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100')}>
                        <div className="flex items-center gap-2">
                            {lastTrust === 'L3' && <ShieldCheck className="text-emerald-600" size={20} />}
                            {message}
                        </div>
                        {lastTrust === 'L3' && lastMethod === 'TRAJETO' && (
                            <span className="text-[10px] uppercase tracking-tighter opacity-70">Sua jornada foi validada pelo sistema</span>
                        )}
                    </div>
                )}

                <div className="pt-6 mt-2 border-t border-gray-100 dark:border-gray-700 space-y-4">
                    <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-3 rounded-xl">
                        <p className="text-[11px] text-indigo-800 dark:text-indigo-300 font-medium leading-relaxed">
                            💡 <strong>Dica L3:</strong> Marque &quot;Entrei&quot; no embarque e &quot;Desci&quot; ao chegar no destino para ganhar Prova de Trajeto automaticamente.
                        </p>
                    </div>

                    <button
                        onClick={() => setIsScannerOpen(true)}
                        className="w-full flex items-center justify-center gap-2 bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 font-bold py-3 px-4 rounded-xl transition-all active:scale-95 border-2 border-indigo-100 dark:border-indigo-900 hover:border-indigo-200"
                    >
                        <QrCode size={18} />
                        Prova de Ponto Parceiro (QR)
                    </button>
                    <p className="text-[10px] text-gray-400 text-center uppercase font-bold tracking-widest">
                        Scaneie materiais oficiais ou de parceiros locais
                    </p>
                </div>
            </div>

            {isScannerOpen && (
                <QRScanner onClose={() => setIsScannerOpen(false)} />
            )}

            <RatingModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                lineId={MOCK_LINE_ID}
                deviceId={deviceId}
            />

            <HelpModal
                storageKey="help_registrar_v1"
                tips={[
                    "Marque 'Ônibus Passou' se o veículo chegou cheio ou você preferiu não embarcar.",
                    "Marque 'Entrei' ao embarcar. Se depois marcar 'Desci', o sistema gera Prova de Trajeto (L3).",
                    "L1 = Relato individual. L2 = Confirmado por outros no mesmo ponto. L3 = Prova física.",
                ]}
            />
        </main>
    );
}
