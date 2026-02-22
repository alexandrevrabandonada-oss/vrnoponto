'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';
import { useUiPrefs } from '@/lib/useUiPrefs';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
    const { uiMode, density, setUiMode, setDensity } = useUiPrefs();

    // Focus trapping and Escape key closing
    React.useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-6"
            aria-labelledby="settings-modal-title"
            role="dialog"
            aria-modal="true"
        >
            <div
                className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
                aria-hidden="true"
            />

            <div className="relative w-full max-w-md bg-surface border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/5 bg-surface-2">
                    <h3 id="settings-modal-title" className="font-industrial text-lg text-white">Visual e Leitura</h3>
                    <IconButton
                        icon={<X size={20} />}
                        variant="ghost"
                        onClick={onClose}
                        aria-label="Fechar configurações"
                        className="!p-2 hover:bg-white/5"
                    />
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-8">
                    {/* UI Mode Toggle */}
                    <div className="space-y-4">
                        <div>
                            <p className="text-white font-medium mb-1">Tamanho e Conforto</p>
                            <p className="text-white/50 text-sm">Para facilitar leitura e toque, remove os fundos em vidro transparente.</p>
                        </div>

                        <div className="flex bg-surface-2 rounded-xl p-1 border border-white/5">
                            <button
                                onClick={() => setUiMode('default')}
                                className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-colors ${uiMode === 'default' ? 'bg-surface text-brand shadow border border-white/10' : 'text-white/50 hover:text-white'}`}
                                aria-pressed={uiMode === 'default'}
                            >
                                Padrão
                            </button>
                            <button
                                onClick={() => setUiMode('legivel')}
                                className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-colors ${uiMode === 'legivel' ? 'bg-surface text-brand shadow border border-white/10' : 'text-white/50 hover:text-white'}`}
                                aria-pressed={uiMode === 'legivel'}
                            >
                                Letras Maiores
                            </button>
                        </div>
                    </div>

                    {/* Density Toggle */}
                    <div className="space-y-4">
                        <div>
                            <p className="text-white font-medium mb-1">Densidade da Interface</p>
                            <p className="text-white/50 text-sm">Ajusta o espaçamento de listas e caixas da aplicação.</p>
                        </div>

                        <div className="flex bg-surface-2 rounded-xl p-1 border border-white/5">
                            <button
                                onClick={() => setDensity('comfort')}
                                className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-colors ${density === 'comfort' ? 'bg-surface text-brand shadow border border-white/10' : 'text-white/50 hover:text-white'}`}
                                aria-pressed={density === 'comfort'}
                            >
                                Conforto
                            </button>
                            <button
                                onClick={() => setDensity('compact')}
                                className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-colors ${density === 'compact' ? 'bg-surface text-brand shadow border border-white/10' : 'text-white/50 hover:text-white'}`}
                                aria-pressed={density === 'compact'}
                            >
                                Mais Itens
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
