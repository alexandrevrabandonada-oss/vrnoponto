'use client';

import { useState } from 'react';
import {
    Phone, Instagram, Home, MessageSquare,
    CheckCircle2, Loader2, ArrowLeft, Navigation, Store, ShieldCheck
} from 'lucide-react';
import Link from 'next/link';
import { TelemetryTracker } from '@/components/TelemetryTracker';

const CATEGORIES = [
    { value: 'comercio', label: 'Comércio' },
    { value: 'coletivo', label: 'Coletivo / Movimento' },
    { value: 'sindicato', label: 'Sindicato / Associação' },
    { value: 'escola', label: 'Escola / Educação' },
    { value: 'saude', label: 'Saúde / Clínica' },
    { value: 'religioso', label: 'Espaço Religioso' },
    { value: 'outro', label: 'Outro' },
];

export default function ParceirosEntrarPage() {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [gettingLocation, setGettingLocation] = useState(false);

    const [form, setForm] = useState({
        name: '',
        contact_name: '',
        contact_phone: '',
        contact_instagram: '',
        neighborhood: '',
        address: '',
        category: 'comercio',
        lat: '',
        lng: '',
        message: '',
        authorized: false,
        // Honeypot — never shown to user, set by bots
        website: '',
    });

    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setForm(prev => ({ ...prev, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));

    const getLocation = () => {
        if (!navigator.geolocation) return;
        setGettingLocation(true);
        navigator.geolocation.getCurrentPosition(
            pos => {
                setForm(prev => ({ ...prev, lat: pos.coords.latitude.toString(), lng: pos.coords.longitude.toString() }));
                setGettingLocation(false);
            },
            () => setGettingLocation(false)
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Fire click track asynchronously
        fetch('/api/telemetry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: 'click_partner_apply_submit' }),
        }).catch(() => { });

        if (!form.authorized) {
            setError('Você precisa confirmar que tem autorização para instalar o material no local.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/partner-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao enviar pedido.');
            setSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao enviar pedido.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-emerald-50 dark:bg-gray-900 p-6">
                <div className="max-w-md text-center space-y-6">
                    <div className="w-20 h-20 mx-auto bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                        <CheckCircle2 size={48} className="text-emerald-500" />
                    </div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white">Pedido enviado!</h1>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                        Recebemos seu pedido de adesão. Nossa equipe vai entrar em contato em breve pelo WhatsApp ou Instagram que você indicou.
                    </p>
                    <Link href="/parceiros" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition">
                        Ver Pontos Parceiros
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
            <TelemetryTracker eventName="page_view_partner_apply" />
            {/* Header */}
            <header className="bg-indigo-900 text-white p-6 rounded-b-3xl shadow-xl">
                <Link href="/parceiros" className="flex items-center gap-2 text-indigo-200 text-sm mb-4 hover:text-white transition">
                    <ArrowLeft size={16} /> Voltar para Parceiros
                </Link>
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-700/50 p-2.5 rounded-2xl backdrop-blur">
                        <Store size={24} className="text-indigo-100" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight">Quero ser Parceiro</h1>
                        <p className="text-indigo-200 text-sm mt-0.5">Leva menos de 2 minutos. Sem custo.</p>
                    </div>
                </div>
            </header>

            <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-5 space-y-5 mt-4">
                {/* Honeypot - hidden from users */}
                <input type="text" name="website" value={form.website} onChange={set('website')} className="hidden" aria-hidden="true" tabIndex={-1} autoComplete="off" />

                {/* Local Info */}
                <section className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                    <h2 className="font-black text-gray-900 dark:text-white text-sm uppercase tracking-widest flex items-center gap-2">
                        <Home size={16} className="text-indigo-600" /> Sobre o Local
                    </h2>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5">Nome do local *</label>
                        <input required value={form.name} onChange={set('name')} type="text"
                            placeholder="Ex: Padaria da Vila, Sindicato dos Metroviários..."
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5">Bairro *</label>
                            <input required value={form.neighborhood} onChange={set('neighborhood')} type="text"
                                placeholder="Vila Rica, Centro..."
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5">Categoria</label>
                            <select value={form.category} onChange={set('category')}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition">
                                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5">Endereço (opcional)</label>
                        <input value={form.address} onChange={set('address')} type="text"
                            placeholder="Rua 33, nº 10"
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition" />
                    </div>

                    {/* GPS */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5">Localização GPS (opcional)</label>
                        <div className="flex items-center gap-3">
                            <button type="button" onClick={getLocation} disabled={gettingLocation}
                                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl text-sm font-bold hover:bg-indigo-100 transition disabled:opacity-50">
                                {gettingLocation ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
                                Usar minha localização
                            </button>
                            {form.lat && <span className="text-xs text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 size={14} /> GPS capturado</span>}
                        </div>
                    </div>
                </section>

                {/* Contact Info */}
                <section className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                    <h2 className="font-black text-gray-900 dark:text-white text-sm uppercase tracking-widest flex items-center gap-2">
                        <Phone size={16} className="text-indigo-600" /> Contato
                    </h2>
                    <p className="text-xs text-gray-500">Preencha pelo menos um campo de contato.</p>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5">Seu nome (pessoa responsável)</label>
                        <input value={form.contact_name} onChange={set('contact_name')} type="text"
                            placeholder="João Silva"
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="relative">
                            <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input value={form.contact_phone} onChange={set('contact_phone')} type="tel"
                                placeholder="WhatsApp: (24) 9 9999-9999"
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition" />
                        </div>
                        <div className="relative">
                            <Instagram size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input value={form.contact_instagram} onChange={set('contact_instagram')} type="text"
                                placeholder="@instagram"
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition" />
                        </div>
                    </div>
                </section>

                {/* Message */}
                <section className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                    <h2 className="font-black text-gray-900 dark:text-white text-sm uppercase tracking-widest flex items-center gap-2">
                        <MessageSquare size={16} className="text-indigo-600" /> Mensagem (opcional)
                    </h2>
                    <textarea value={form.message} onChange={set('message')} rows={3}
                        placeholder="Algo que queira nos contar sobre o local ou sua motivação..."
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition resize-none" />
                </section>

                {/* Authorization Checkbox */}
                <label className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-4 rounded-2xl cursor-pointer">
                    <input type="checkbox" checked={form.authorized} onChange={e => setForm(p => ({ ...p, authorized: e.target.checked }))}
                        className="mt-0.5 w-5 h-5 rounded accent-indigo-600 flex-shrink-0" />
                    <div>
                        <span className="font-bold text-sm text-amber-900 dark:text-amber-200">
                            Tenho autorização para expor um cartaz/QR Code no meu local
                        </span>
                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                            Confirmo que o local me pertence ou tenho permissão do responsável.
                        </p>
                    </div>
                </label>

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/30 px-4 py-3 rounded-2xl text-sm font-medium">
                        {error}
                    </div>
                )}

                <button type="submit" disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-black py-4 rounded-3xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2 text-sm">
                    {loading ? <Loader2 size={20} className="animate-spin" /> : <ShieldCheck size={20} />}
                    {loading ? 'Enviando...' : 'Enviar Pedido de Adesão'}
                </button>

                <p className="text-center text-xs text-gray-400">
                    Seus dados são usados somente para contato e não são exibidos publicamente.
                </p>
            </form>
        </div>
    );
}
