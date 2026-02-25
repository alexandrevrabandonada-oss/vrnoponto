'use client';

import { useState, useEffect } from 'react';
import { X, MapPin, Send, CheckCircle } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { formatStopName } from '@/lib/utils';

interface StopSuggestionModalProps {
    lat: number;
    lng: number;
    deviceId: string | null;
    onClose: () => void;
}

export function StopSuggestionModal({ lat, lng, deviceId, onClose }: StopSuggestionModalProps) {
    const [name, setName] = useState('');
    const [notes, setNotes] = useState('');
    const [neighborhood, setNeighborhood] = useState('');
    const [honeypot, setHoneypot] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [deduped, setDeduped] = useState(false);
    const [confirmations, setConfirmations] = useState(0);
    const [error, setError] = useState('');

    // Close on ESC
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const trackTelemetry = (event: string) => {
        fetch('/api/telemetry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event })
        }).catch(() => { /* silent */ });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const formattedName = formatStopName(name);

        if (!formattedName || formattedName.length < 6) {
            setError('Nome do ponto muito curto. Use pelo menos 6 letras (Ex: Próximo à Padaria Y).');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const res = await fetch('/api/stop-suggestion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formattedName,
                    notes: notes.trim() || undefined,
                    lat,
                    lng,
                    neighborhood: neighborhood.trim() || undefined,
                    device_id: deviceId || undefined,
                    website: honeypot || undefined, // honeypot
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Erro ao enviar sugestão');
            }

            if (data.deduped) {
                trackTelemetry('stop_suggestion_submit_success');
                setDeduped(true);
                setConfirmations(data.confirmations || 1);
            } else {
                trackTelemetry('stop_suggestion_submit_success');
            }
            setSuccess(true);
        } catch (err: unknown) {
            trackTelemetry('stop_suggestion_submit_fail');
            setError(err instanceof Error ? err.message : 'Erro desconhecido');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <Card className="w-full max-w-md !bg-zinc-900 border-white/10 relative animate-in slide-in-from-bottom-4 duration-300">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
                    aria-label="Fechar"
                >
                    <X size={20} />
                </button>

                {success ? (
                    /* Success state */
                    <div className="py-8 text-center space-y-4">
                        <CheckCircle size={48} className="mx-auto text-brand" />
                        <div className="space-y-2">
                            <p className="text-lg font-bold text-white">
                                {deduped ? 'Confirmado!' : 'Obrigado!'}
                            </p>
                            <p className="text-xs text-muted uppercase tracking-wide font-bold">
                                {deduped
                                    ? `Já existia uma sugestão aqui — você confirmou ✅ (${confirmations} confirmações)`
                                    : 'Sugestão enviada — vai para aprovação da equipe.'}
                            </p>
                        </div>
                        <Button
                            variant="secondary"
                            onClick={onClose}
                            className="mt-4"
                        >
                            Fechar
                        </Button>
                    </div>
                ) : (
                    /* Form */
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <MapPin size={18} className="text-brand" />
                                <h2 className="text-sm font-black uppercase tracking-widest text-white">
                                    Sugerir Ponto
                                </h2>
                            </div>
                            <p className="text-[10px] text-muted font-bold uppercase tracking-tight">
                                Sua localização atual será usada como referência
                            </p>
                        </div>

                        <div className="space-y-3">
                            {/* Name (required) */}
                            <div>
                                <label htmlFor="suggestion-name" className="block text-[10px] font-black uppercase tracking-widest text-white/60 mb-1">
                                    Nome do ponto *
                                </label>
                                <input
                                    id="suggestion-name"
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ex: Em frente ao Hospital X ou Próximo à Padaria Y"
                                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/30 transition-all font-bold"
                                    maxLength={200}
                                />
                                <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest mt-1 ml-1">
                                    Use referências: &quot;Em frente ao...&quot;, &quot;Próximo à...&quot;
                                </p>
                            </div>

                            {/* Notes (optional) */}
                            <div>
                                <label htmlFor="suggestion-notes" className="block text-[10px] font-black uppercase tracking-widest text-white/60 mb-1">
                                    Observação (opcional)
                                </label>
                                <input
                                    id="suggestion-notes"
                                    type="text"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Em frente ao mercado…, do lado da farmácia…"
                                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/30 transition-all"
                                    maxLength={500}
                                />
                            </div>

                            {/* Neighborhood (optional) */}
                            <div>
                                <label htmlFor="suggestion-neighborhood" className="block text-[10px] font-black uppercase tracking-widest text-white/60 mb-1">
                                    Bairro (opcional)
                                </label>
                                <input
                                    id="suggestion-neighborhood"
                                    type="text"
                                    value={neighborhood}
                                    onChange={(e) => setNeighborhood(e.target.value)}
                                    placeholder="Ex: Vila Rica"
                                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/30 transition-all"
                                    maxLength={100}
                                />
                            </div>

                            {/* Honeypot - hidden from real users */}
                            <input
                                type="text"
                                name="website"
                                value={honeypot}
                                onChange={(e) => setHoneypot(e.target.value)}
                                tabIndex={-1}
                                autoComplete="off"
                                aria-hidden="true"
                                style={{ position: 'absolute', left: '-9999px', opacity: 0 }}
                            />
                        </div>

                        {error && (
                            <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs font-bold uppercase tracking-tight text-center">
                                {error}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={onClose}
                                className="flex-1"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                loading={isSubmitting}
                                disabled={!name.trim()}
                                className="flex-1 !bg-brand !text-black hover:!brightness-110"
                                icon={<Send size={16} />}
                                iconPosition="right"
                            >
                                Enviar
                            </Button>
                        </div>
                    </form>
                )}
            </Card>
        </div>
    );
}
