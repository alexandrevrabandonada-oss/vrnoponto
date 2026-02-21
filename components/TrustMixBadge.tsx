import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';

interface TrustMixBadgeProps {
    total: number;
    pctVerified: number;
}

export function TrustMixBadge({ total, pctVerified }: TrustMixBadgeProps) {
    if (total === undefined || pctVerified === undefined) {
        return null;
    }

    // Define color and specific copy based on total size to avoid accusing small samples
    const isSmallSample = total < 10;
    const verifiedScore = Math.round(pctVerified);

    // Decide variant colors based on verification score, overriding to neutral if small sample
    let bgColor = 'bg-gray-100';
    let textColor = 'text-gray-700';
    let iconColor = 'text-gray-500';

    if (!isSmallSample) {
        if (verifiedScore >= 70) {
            bgColor = 'bg-emerald-50';
            textColor = 'text-emerald-800';
            iconColor = 'text-emerald-600';
        } else if (verifiedScore >= 40) {
            bgColor = 'bg-amber-50';
            textColor = 'text-amber-800';
            iconColor = 'text-amber-600';
        } else {
            bgColor = 'bg-rose-50';
            textColor = 'text-rose-800';
            iconColor = 'text-rose-600';
        }
    }

    const tooltipText = isSmallSample
        ? `A amostra atual (${total} registros no mês) é pequena para garantir a certeza dos dados estatísticos. Quando há poucos dados, qualquer checagem pode distorcer o "Selo de Confiabilidade".`
        : `O "Selo de Confiabilidade" indica a qualidade dos ${total} registros de horário coletados nos últimos 30 dias. Um nível alto (${verifiedScore}%) significa que a maioria desses dados foi cruzada múltiplas vezes (L2) ou via métodos robustos como Motoristas Parceiros e Trajeto GPS do ônibus real (L3). L1 são relatos únicos sem cruzamento.`;

    return (
        <div className={`group relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-black/5 ${bgColor} ${textColor}`}>
            <ShieldCheck size={14} className={iconColor} />

            {isSmallSample ? (
                <span>Amostra Pequena ({total})</span>
            ) : (
                <span>Amostra: {total} | Verificado: {verifiedScore}%</span>
            )}

            {/* Info Icon + Tooltip Hover Trigger */}
            <div className="flex items-center ml-1 cursor-help opacity-70 hover:opacity-100 transition-opacity">
                <Info size={12} />
                {/* The Tooltip Body */}
                <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900/95 text-white text-[11px] leading-relaxed p-2.5 rounded-lg w-56 bottom-full mb-2 left-1/2 -translate-x-1/2 pointer-events-none z-50">
                    {tooltipText}
                    {/* Tooltip Arrow */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900/95" />
                </div>
            </div>
        </div>
    );
}
