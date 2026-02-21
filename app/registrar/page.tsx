'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useDeviceId } from '@/hooks/useDeviceId';
import { RatingModal } from '@/components/RatingModal';

const MOCK_LINE_ID = '11111111-1111-1111-1111-111111111111';
const MOCK_STOP_ID = '22222222-2222-2222-2222-222222222222';

export default function Registrar() {
    const deviceId = useDeviceId();
    const supabase = createClient();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');

    const registerEvent = async (eventType: string) => {
        if (!deviceId) return alert('Device ID não pronto');

        setIsSubmitting(true);
        setMessage('');

        const { error } = await supabase.from('stop_events').insert({
            stop_id: MOCK_STOP_ID,
            line_id: MOCK_LINE_ID,
            device_id: deviceId,
            event_type: eventType,
        });

        setIsSubmitting(false);

        if (error) {
            setMessage('Erro ao registrar evento: ' + error.message);
        } else {
            setMessage("Evento de '" + eventType + "' salvo!");
            // Abrir modal se for embarque ou passou
            if (eventType === 'boarding' || eventType === 'passed_by') {
                setIsModalOpen(true);
            }
        }
    };

    return (
        <main className="flex min-h-screen flex-col items-center p-8 bg-gray-50 dark:bg-gray-900">
            <h1 className="text-3xl font-bold mb-6 text-indigo-600 dark:text-indigo-400">Registrar Ação</h1>

            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 p-4 rounded-lg text-sm mb-6 border border-blue-200 dark:border-blue-800">
                    Você está simulando o ponto <strong>Centro (PT-001)</strong>, linha <strong>P200 - Vila Rica</strong>.
                </div>

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
                    onClick={() => {
                        // Nota: Embora 'alighted' n seja uma role map em nosso BD, eu adicionei no prompt como 'Desci'. 
                        // O tipo de event que a api aceita: arrived, boarding, passed_by, delayed.
                        // Vou usar arrived apenas no outro app, e delayed aqui ou algo assim. 
                        // Ops, nossa constraint check nao verifica os enumeraveis, eles apenas sāo varchar ali!
                        // Entao vou usar 'alighted' que faz sentido semanticamente.
                        registerEvent('alighted');
                    }}
                    disabled={isSubmitting || !deviceId}
                    className="w-full bg-gray-500 hover:bg-gray-600 disabled:opacity-50 text-white font-bold py-4 px-4 rounded-xl shadow-md transition-all active:scale-95"
                >
                    🚶 Cancelar Espera (Desci / Desisti)
                </button>

                {message && (
                    <div className={"mt-4 p-3 rounded-lg text-center font-medium " + (message.includes('Erro') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700')}>
                        {message}
                    </div>
                )}
            </div>

            <RatingModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                lineId={MOCK_LINE_ID}
                deviceId={deviceId}
            />
        </main>
    );
}
