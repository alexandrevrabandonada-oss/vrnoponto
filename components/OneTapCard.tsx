'use client';

import React, { useState } from 'react';
import { Card, Button } from '@/components/ui';
import { Bus, Zap, ChevronRight, Loader2, Check, Wifi, WifiOff, ChevronDown } from 'lucide-react';
import { useOneTap, OneTapResult } from '@/hooks/useOneTap';

interface OneTapCardProps {
    stopId: string;
    stopName: string;
    defaultLineId?: string;
    mode?: 'registrar' | 'no-ponto';
    onRecorded?: (result: OneTapResult) => void;
}

export const OneTapCard = ({
    stopId,
    stopName,
    defaultLineId,
    mode = 'registrar',
    onRecorded
}: OneTapCardProps) => {
    const {
        suggestion,
        selectedLine,
        topLines,
        isLoadingSuggestion,
        isLoadingTopLines,
        isSubmitting,
        feedback,
        selectLine,
        record
    } = useOneTap({ stopId, defaultLineId, onRecorded });

    const [showLinePicker, setShowLinePicker] = useState(false);

    if (isLoadingSuggestion) {
        return (
            <Card variant="surface2" className="border-brand/20 bg-brand/5 p-6 flex flex-col items-center justify-center min-h-[200px]">
                <Loader2 className="animate-spin text-brand mb-2" size={32} />
                <p className="text-[10px] font-black uppercase tracking-widest text-brand/50">Analisando Padrões...</p>
            </Card>
        );
    }

    if (!selectedLine && !suggestion) return null;

    const activeLine = selectedLine || suggestion;
    if (!activeLine) return null;

    const confidenceLabels = {
        HIGH: 'Confiança Alta',
        MED: 'Sugestão Popular',
        LOW: 'Possível Opção'
    };

    const passedLabel = mode === 'no-ponto' ? 'Ônibus Passou' : 'VAI PASSAR';
    const boardingLabel = mode === 'no-ponto' ? 'Entrei' : 'EMBARCAR';

    return (
        <Card variant="surface2" className="border-brand/30 bg-brand/5 p-5 sm:p-6 overflow-hidden relative">
            {/* Confidence Badge */}
            {suggestion && (
                <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-[9px] font-black uppercase tracking-tighter
                    ${suggestion.confidence === 'HIGH' ? 'bg-brand text-black' : 'bg-white/10 text-white/50'}`}>
                    {confidenceLabels[suggestion.confidence]}
                </div>
            )}

            <div className="flex items-start gap-4 mb-6">
                <div className="bg-brand/10 p-3 rounded-2xl text-brand shrink-0">
                    <Bus size={24} />
                </div>
                <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-brand opacity-60">Linha Detectada</h3>
                    <p className="text-xl font-black text-white leading-tight uppercase font-industrial tracking-tight">
                        {activeLine.code} - {activeLine.name}
                    </p>
                    <p className="text-[10px] font-bold text-muted uppercase tracking-tight mt-1">
                        Em <span className="text-white/80">{stopName}</span>
                    </p>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <Button
                    onClick={() => record('passed_by')}
                    loading={isSubmitting}
                    className="h-16 !text-lg !bg-orange-600 hover:!bg-orange-500 !text-white flex-col !gap-0"
                >
                    <span className="text-[10px] uppercase font-black tracking-widest opacity-70">Passou agora</span>
                    <span className="font-industrial tracking-tight">{passedLabel}</span>
                </Button>

                <Button
                    onClick={() => record('boarding')}
                    loading={isSubmitting}
                    className="h-16 !text-lg !bg-emerald-600 hover:!bg-emerald-500 !text-white flex-col !gap-0"
                >
                    <span className="text-[10px] uppercase font-black tracking-widest opacity-70">Entrar no</span>
                    <span className="font-industrial tracking-tight">{boardingLabel}</span>
                </Button>
            </div>

            {/* Feedback */}
            {feedback && (
                <div className={`p-3 rounded-xl text-center text-sm font-bold mb-4 animate-scale-in flex items-center justify-center gap-2
                    ${feedback.type === 'ok' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : ''}
                    ${feedback.type === 'queued' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : ''}
                    ${feedback.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : ''}
                `}>
                    {feedback.type === 'ok' && <Check size={16} />}
                    {feedback.type === 'queued' && <WifiOff size={16} />}
                    {feedback.type === 'error' && <Wifi size={16} />}
                    {feedback.text}
                </div>
            )}

            {/* Line Switcher */}
            <button
                onClick={() => setShowLinePicker(!showLinePicker)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors border border-white/5 group"
            >
                <div className="flex items-center gap-2">
                    <Zap size={14} className="text-brand opacity-50" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40 group-hover:text-white/70">Não é esta linha?</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-brand">
                    Trocar Linha
                    {showLinePicker ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </div>
            </button>

            {/* Line Picker Dropdown */}
            {showLinePicker && (
                <div className="mt-3 space-y-1 animate-in slide-in-from-top-2 duration-300">
                    {isLoadingTopLines ? (
                        <div className="p-4 text-center">
                            <Loader2 className="animate-spin text-brand mx-auto" size={20} />
                        </div>
                    ) : topLines.length > 0 ? (
                        topLines.map(line => (
                            <button
                                key={line.line_id}
                                onClick={() => {
                                    selectLine(line);
                                    setShowLinePicker(false);
                                }}
                                className={`w-full text-left p-3 rounded-xl transition-colors border
                                    ${selectedLine?.line_id === line.line_id
                                        ? 'bg-brand/10 border-brand/30 text-white'
                                        : 'bg-white/[0.02] border-white/5 text-white/60 hover:bg-white/[0.05] hover:text-white/80'
                                    }`}
                            >
                                <span className="font-industrial text-sm tracking-tight uppercase">
                                    {line.code} - {line.name}
                                </span>
                            </button>
                        ))
                    ) : (
                        <p className="text-[10px] text-white/30 text-center p-3 font-bold uppercase tracking-widest">
                            Nenhuma linha alternativa encontrada
                        </p>
                    )}
                </div>
            )}
        </Card>
    );
};
