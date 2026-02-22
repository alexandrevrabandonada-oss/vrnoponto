import { CheckCircle, ShieldCheck } from 'lucide-react';

export function TrustBadge({ level }: { level: 'L1' | 'L2' | 'L3' }) {
    if (level === 'L2') {
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 shadow-sm border border-green-200 dark:border-green-800" title="Verificado pela comunidade">
                <ShieldCheck size={14} />
                L2 Verificado
            </span>
        );
    }

    // Se L3 (Oficial)
    if (level === 'L3') {
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand/20 text-brand dark:bg-brand/10 dark:text-brand shadow-sm border border-brand/30 dark:border-brand/20" title="Dado Oficial">
                <CheckCircle size={14} />
                L3 Oficial
            </span>
        );
    }

    // Default L1
    return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700" title="Relato Único">
            L1 Base
        </span>
    );
}
