'use client';

import * as React from 'react';
import { X, Shield, ChevronRight, Lock } from 'lucide-react';
import { IconButton } from './IconButton';
import { useUiPrefs } from '@/lib/useUiPrefs';
import Link from 'next/link';

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

                    {/* Admin Access Section */}
                    <div className="pt-6 border-t border-white/5 space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Shield size={16} className="text-brand" />
                            <p className="text-white font-medium">Acesso Administrativo</p>
                        </div>

                        <div className="space-y-3">
                            <Link href="/admin/dia1" onClick={onClose} className="w-full flex items-center justify-between p-4 rounded-xl bg-brand/10 border border-brand/20 hover:bg-brand/20 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <Shield size={18} className="text-brand" />
                                    <span className="text-sm text-brand font-bold uppercase tracking-widest">Setup Dia 1 (2 min)</span>
                                </div>
                                <ChevronRight size={18} className="text-brand/50" />
                            </Link>
                            <AdminLogin />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AdminLogin = () => {
    const [showInput, setShowInput] = React.useState(false);
    const [token, setToken] = React.useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        const cleanToken = token.trim();
        if (cleanToken) {
            // Save to localStorage so components can use it for API calls
            localStorage.setItem('vrnp_admin_token', cleanToken);
            localStorage.setItem('admin_token', cleanToken); // Compatibility with older components

            window.location.href = `/admin?t=${encodeURIComponent(cleanToken)}`;
        }
    };

    if (!showInput) {
        return (
            <button
                onClick={() => setShowInput(true)}
                className="w-full flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/5 transition-colors group"
            >
                <div className="flex items-center gap-3">
                    <Lock size={18} className="text-white/30 group-hover:text-brand transition-colors" />
                    <span className="text-sm text-white/70">Painel de Administração</span>
                </div>
                <ChevronRight size={18} className="text-white/20" />
            </button>
        );
    }

    return (
        <form onSubmit={handleLogin} className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="relative">
                <input
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Cole seu token de acesso..."
                    autoFocus
                    className="w-full bg-surface-2 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand/50 transition-colors"
                />
            </div>
            <div className="flex gap-2">
                <button
                    type="submit"
                    className="flex-1 bg-brand text-black font-black uppercase tracking-tight py-3 rounded-xl text-xs hover:brightness-110 active:scale-95 transition-all"
                >
                    Acessar Painel
                </button>
                <button
                    type="button"
                    onClick={() => setShowInput(false)}
                    className="px-4 py-3 rounded-xl bg-white/5 text-white/50 text-xs hover:text-white transition-colors"
                >
                    Cancelar
                </button>
            </div>
        </form>
    );
};

