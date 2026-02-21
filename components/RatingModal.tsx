'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface RatingModalProps {
    isOpen: boolean;
    onClose: () => void;
    lineId: string;
    deviceId: string | null;
}

export function RatingModal({ isOpen, onClose, lineId, deviceId }: RatingModalProps) {
    const supabase = createClient();
    const [crowdingLevel, setCrowdingLevel] = useState<number>(3);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!deviceId) return alert('Device ID não encontrado');
        setIsSubmitting(true);
        setMessage('');

        const { error } = await supabase.from('bus_ratings').insert({
            line_id: lineId,
            device_id: deviceId,
            crowding_level: crowdingLevel,
        });

        setIsSubmitting(false);

        if (error) {
            setMessage('Erro ao salvar avaliação: ' + error.message);
        } else {
            setMessage('Avaliação enviada! Obrigado.');
            setTimeout(() => {
                onClose();
                setMessage('');
                setCrowdingLevel(3);
            }, 2000);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-sm space-y-6">
                <h2 className="text-xl font-bold dark:text-white">Avaliar Lotação</h2>

                <div className="space-y-4">
                    <label className="block text-sm font-medium dark:text-gray-200 text-center">
                        Como está o ônibus? (1 = Vazio, 5 = Super Lotado)
                    </label>
                    <div className="flex justify-between items-center text-2xl">
                        {[1, 2, 3, 4, 5].map((level) => (
                            <button
                                key={level}
                                onClick={() => setCrowdingLevel(level)}
                                className={
                                    "w-12 h-12 rounded-full font-bold flex items-center justify-center transition-all " +
                                    (crowdingLevel === level
                                        ? "bg-indigo-600 text-white transform scale-110 shadow-lg"
                                        : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300")
                                }
                            >
                                {level}
                            </button>
                        ))}
                    </div>
                </div>

                {message && (
                    <div className={"p-3 rounded-lg text-sm text-center font-medium " + (message.includes('Erro') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700')}>
                        {message}
                    </div>
                )}

                <div className="flex gap-3 justify-end pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        Pular
                    </button>
                    <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleSubmit}
                        className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-400 rounded-lg transition-colors font-semibold shadow-md"
                    >
                        {isSubmitting ? 'Enviando...' : 'Avaliar'}
                    </button>
                </div>
            </div>
        </div>
    );
}
