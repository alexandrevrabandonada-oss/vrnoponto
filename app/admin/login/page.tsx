'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { KeyRound, LogIn } from 'lucide-react';

function getSafeAdminNext(nextPath: string | null): string {
    if (!nextPath) return '/admin';
    if (!nextPath.startsWith('/admin')) return '/admin';
    return nextPath;
}

export default function AdminLoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [token, setToken] = React.useState('');
    const [error, setError] = React.useState('');

    React.useEffect(() => {
        const stored = localStorage.getItem('vrnp_admin_token') || localStorage.getItem('admin_token') || '';
        if (stored) {
            setToken(stored);
        }
    }, []);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const clean = token.trim();
        if (!clean) {
            setError('Informe o token de admin.');
            return;
        }

        localStorage.setItem('vrnp_admin_token', clean);
        localStorage.setItem('admin_token', clean);

        const nextPath = getSafeAdminNext(searchParams.get('next'));
        const join = nextPath.includes('?') ? '&' : '?';
        router.push(`${nextPath}${join}t=${encodeURIComponent(clean)}`);
    };

    return (
        <div className="max-w-xl mx-auto py-12">
            <div className="rounded-3xl border border-white/10 bg-[#10141b] shadow-2xl p-8 space-y-6">
                <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand">Gate de acesso</p>
                    <h1 className="font-industrial text-3xl italic uppercase text-white">Login Admin</h1>
                    <p className="text-sm text-white/60">
                        Digite o token para acessar o painel administrativo.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <label htmlFor="admin-token" className="text-[10px] font-black uppercase tracking-widest text-white/50 block">
                        Token
                    </label>
                    <div className="relative">
                        <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                        <input
                            id="admin-token"
                            value={token}
                            onChange={(e) => {
                                setToken(e.target.value);
                                if (error) setError('');
                            }}
                            placeholder="Cole o token de admin"
                            className="w-full h-12 pl-10 pr-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand/50"
                        />
                    </div>

                    {error && (
                        <p className="text-[11px] font-bold text-red-400">{error}</p>
                    )}

                    <button
                        type="submit"
                        className="w-full h-12 rounded-xl bg-brand text-black font-black text-[10px] uppercase tracking-widest hover:brightness-105 transition inline-flex items-center justify-center gap-2"
                    >
                        <LogIn size={14} />
                        Entrar no Admin
                    </button>
                </form>
            </div>
        </div>
    );
}

