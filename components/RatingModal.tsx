'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button, Field, RadioGroup, Card } from '@/components/ui';

interface RatingModalProps {
    isOpen: boolean;
    onClose: () => void;
    lineId: string;
    deviceId: string | null;
}

const CROWDING_OPTIONS = [
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
    { value: '4', label: '4' },
    { value: '5', label: '5' },
];

export function RatingModal({ isOpen, onClose, lineId, deviceId }: RatingModalProps) {
    const supabase = createClient();
    const [crowdingLevel, setCrowdingLevel] = useState<string>('3');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');

    // Close on ESC
    useEffect(() => {
        if (!isOpen) return;
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!deviceId) return;
        setIsSubmitting(true);
        setMessage('');

        const { error } = await supabase.from('bus_ratings').insert({
            line_id: lineId,
            device_id: deviceId,
            crowding_level: parseInt(crowdingLevel),
        });

        setIsSubmitting(false);

        if (error) {
            setMessage('ERRO AO SALVAR: ' + error.message.toUpperCase());
        } else {
            setMessage('AVALIAÇÃO RECEBIDA!');
            setTimeout(() => {
                onClose();
                setMessage('');
                setCrowdingLevel('3');
            }, 1000);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <Card className="w-full max-w-[340px] space-y-6 border-brand/20 shadow-2xl shadow-brand/10">
                <div className="space-y-1">
                    <h2 className="text-xl font-black uppercase tracking-tighter text-white">Avaliar Lotação</h2>
                    <p className="text-[10px] text-muted font-black uppercase tracking-widest opacity-60">Linha: P200 Vila Rica</p>
                </div>

                <div className="space-y-6">
                    <Field
                        label="Como está o ônibus agora?"
                        hint="1 = Vazio | 5 = Crítico"
                    >
                        <RadioGroup
                            id="crowding"
                            name="crowding"
                            orientation="horizontal"
                            options={CROWDING_OPTIONS}
                            value={crowdingLevel}
                            onChange={setCrowdingLevel}
                        />
                    </Field>
                </div>

                {message && (
                    <div className={`p-4 rounded-xl text-[11px] font-bold text-center tracking-widest border animate-in slide-in-from-top-1 ${message.includes('ERRO')
                        ? 'bg-danger/10 border-danger/20 text-danger'
                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        }`}>
                        {message}
                    </div>
                )}

                <div className="flex gap-4 pt-2">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="flex-1 !h-12 !text-[11px]"
                    >
                        DESCARTAR
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        loading={isSubmitting}
                        className="flex-1 !h-12 !text-[11px]"
                    >
                        ENVIAR
                    </Button>
                </div>
            </Card>
        </div>
    );
}
