'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, Bus, Check, Hash, Info } from 'lucide-react';
import { Button, Card } from '@/components/ui';

interface Line {
    id: string;
    code: string;
    name: string;
}

interface LineSearchModalProps {
    onClose: () => void;
    onSelect: (line: { line_id: string, code: string, name: string }) => void;
}

export function LineSearchModal({ onClose, onSelect }: LineSearchModalProps) {
    const [search, setSearch] = useState('');
    const [lines, setLines] = useState<Line[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        async function fetchLines() {
            try {
                const res = await fetch('/api/lines');
                if (!res.ok) throw new Error('Erro ao carregar linhas');
                const data = await res.json();
                setLines(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Erro desconhecido');
            } finally {
                setIsLoading(false);
            }
        }
        fetchLines();
    }, []);

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Close on ESC
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const filteredLines = lines.filter(l =>
        l.code.toLowerCase().includes(search.toLowerCase()) ||
        l.name.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 10);

    const handleSelectUnknown = () => {
        onSelect({
            line_id: 'unknown',
            code: '???',
            name: 'Linha não identificada'
        });
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <Card className="w-full max-w-md !bg-[#0c0f14] border-white/10 shadow-2xl relative overflow-hidden animate-in slide-in-from-bottom-6 duration-500">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 blur-3xl -mr-16 -mt-16" />

                {/* Header */}
                <div className="flex items-center justify-between mb-6 relative">
                    <div className="flex items-center gap-3">
                        <div className="bg-brand/10 p-2 rounded-xl text-brand">
                            <Bus size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-industrial italic uppercase tracking-wide text-white leading-none">Trocar Linha</h2>
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mt-1.5">Busca manual por código ou nome</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-white/20 hover:text-white transition-colors"
                        aria-label="Fechar modal"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Search Input */}
                <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Ex: 155 ou Santa Cruz"
                        className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-brand/50 transition-all text-lg font-bold"
                    />
                </div>

                {/* Results List */}
                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar mb-6">
                    {isLoading ? (
                        <div className="py-12 text-center text-white/20 font-black uppercase tracking-widest italic flex flex-col items-center gap-3">
                            <div className="w-6 h-6 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
                            Consultando banco...
                        </div>
                    ) : filteredLines.length > 0 ? (
                        filteredLines.map(line => (
                            <button
                                key={line.id}
                                onClick={() => {
                                    onSelect({ line_id: line.id, code: line.code, name: line.name });
                                    onClose();
                                }}
                                className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-brand/30 transition-all group min-h-[56px]"
                                aria-label={`Selecionar linha ${line.code} ${line.name}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-mono text-xs font-bold text-brand group-hover:bg-brand group-hover:text-black transition-colors">
                                        {line.code}
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-bold text-white uppercase group-hover:text-brand transition-colors truncate max-w-[180px]">
                                            {line.name}
                                        </p>
                                    </div>
                                </div>
                                <Check size={18} className="text-brand opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                        ))
                    ) : search ? (
                        <div className="py-8 text-center text-white/20 font-black uppercase tracking-widest italic">
                            Nenhuma linha encontrada
                        </div>
                    ) : (
                        <div className="py-8 text-center text-white/20 font-black uppercase tracking-widest italic">
                            Digite para buscar...
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="pt-4 border-t border-white/5 space-y-3">
                    <button
                        onClick={handleSelectUnknown}
                        className="w-full h-14 flex items-center justify-center gap-3 rounded-2xl bg-zinc-800/50 border border-white/5 text-xs font-black uppercase tracking-widest text-white/60 hover:bg-zinc-800 hover:text-white transition-all"
                    >
                        <Hash size={16} />
                        Usar sem linha (desconhecida)
                    </button>

                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-brand/5 border border-brand/10">
                        <Info size={16} className="text-brand shrink-0" />
                        <p className="text-[10px] font-bold text-white/40 leading-relaxed">
                            Ao escolher uma linha manualmente, ela será salva como sua preferência para este ponto.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
}
