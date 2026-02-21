'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    MapPin, Bus, LogOut, ChevronRight, Megaphone, Users,
    ArrowRight, HandHeart, Star
} from 'lucide-react';

const STEPS = [
    {
        number: '1',
        icon: MapPin,
        color: 'bg-indigo-600',
        title: 'Cheguei no ponto',
        desc: 'Abre o app, toca em "Estou no Ponto". O GPS identifica o ponto mais próximo automaticamente.',
        detail: '⏱ Leva ~5 segundos',
    },
    {
        number: '2',
        icon: Bus,
        color: 'bg-orange-500',
        title: 'Ônibus passou ou Entrei',
        desc: 'Quando o \u00f4nibus chegar: toca "Ônibus Passou" se não couber, ou "Entrei" quando embarcar.',
        detail: '⏱ 1 toque',
    },
    {
        number: '3',
        icon: LogOut,
        color: 'bg-emerald-600',
        title: 'Se der, marca "Desci" + avalia',
        desc: 'Ao chegar no destino: marca "Desci" e avalia em 30 segundos. Isso gera Prova de Trajeto (L3)!',
        detail: '⏱ Opcional, mas poderoso',
        optional: true,
    },
];

async function trackCta() {
    try {
        await fetch('/api/telemetry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: 'cta_click' }),
        });
    } catch { /* Silent fail */ }
}

export default function ComoUsarPage() {
    const [started, setStarted] = useState(false);

    const handleStart = async () => {
        setStarted(true);
        await trackCta();
        window.location.href = '/no-ponto';
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
            {/* Hero Header */}
            <header className="bg-indigo-900 text-white px-6 py-10 rounded-b-[40px] shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute -top-10 -right-10 w-48 h-48 bg-indigo-700 rounded-full opacity-30 blur-2xl" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-violet-700 rounded-full opacity-20 blur-3xl" />
                </div>
                <div className="relative z-10 max-w-lg mx-auto text-center">
                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4 border border-white/20">
                        <Star size={12} className="text-yellow-300" />
                        Registra em 10 segundos
                    </div>
                    <h1 className="text-3xl font-black tracking-tight leading-tight">
                        Como usar o<br />VR no Ponto
                    </h1>
                    <p className="text-indigo-200 mt-3 text-sm leading-relaxed max-w-xs mx-auto">
                        Sua participação vira dado. Dado vira pressão. Pressão vira mudança.
                    </p>
                </div>
            </header>

            <div className="max-w-lg mx-auto px-5 py-8 space-y-5">
                {/* Steps */}
                <section className="space-y-4">
                    {STEPS.map((step, i) => {
                        const Icon = step.icon;
                        return (
                            <div key={i} className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex gap-4">
                                <div className={`${step.color} text-white w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg`}>
                                    <Icon size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">PASSO {step.number}</span>
                                        {step.optional && (
                                            <span className="text-[9px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-black px-1.5 py-0.5 rounded-full uppercase tracking-wide">opcional</span>
                                        )}
                                    </div>
                                    <h3 className="font-black text-gray-900 dark:text-white text-base leading-tight">{step.title}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{step.desc}</p>
                                    <p className="text-xs text-gray-400 mt-1.5 font-medium">{step.detail}</p>
                                </div>
                            </div>
                        );
                    })}
                </section>

                {/* CTAs */}
                <section className="space-y-3">
                    <button
                        onClick={handleStart}
                        disabled={started}
                        className="w-full flex items-center justify-between bg-indigo-600 hover:bg-indigo-700 text-white py-5 px-6 rounded-3xl font-black text-base shadow-xl shadow-indigo-200 dark:shadow-none transition-all active:scale-95 disabled:opacity-70"
                    >
                        <span>Começar agora</span>
                        <ArrowRight size={22} />
                    </button>
                    <Link href="/registrar"
                        className="w-full flex items-center justify-center gap-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 py-4 px-6 rounded-3xl font-bold text-sm shadow-sm border border-gray-200 dark:border-gray-700 transition-all active:scale-95 hover:shadow-md">
                        Já estou registrando <ChevronRight size={18} />
                    </Link>
                </section>

                {/* Why section */}
                <section className="bg-gradient-to-br from-red-600 to-orange-600 text-white p-7 rounded-3xl shadow-xl shadow-red-200 dark:shadow-none">
                    <div className="flex items-center gap-2 mb-4">
                        <Megaphone size={20} className="opacity-80" />
                        <h2 className="font-black uppercase tracking-tight text-sm">Por que isso importa?</h2>
                    </div>
                    <p className="text-sm leading-relaxed opacity-90">
                        O transporte público de Volta Redonda falha todo dia, mas <strong>sem dados não há cobrança</strong>. Cada registro seu vira evidência anônima. Junto com outros passageiros, criamos um <strong>boletim de auditoria</strong> que nenhuma empresa de ônibus pode ignorar.
                    </p>
                    <p className="text-sm mt-3 leading-relaxed opacity-90">
                        <strong>Você não precisa de advogado.</strong> Você só precisa de 10 segundos.
                    </p>
                </section>

                {/* Partner link */}
                <section className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="bg-violet-100 dark:bg-violet-900/30 p-2 rounded-xl">
                            <HandHeart size={18} className="text-violet-600 dark:text-violet-400" />
                        </div>
                        <div>
                            <h3 className="font-black text-gray-900 dark:text-white text-sm">Tem um comércio ou coletivo?</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Vire um Ponto Parceiro e ajude quem passa na sua rua.</p>
                        </div>
                    </div>
                    <Link href="/parceiros/entrar"
                        className="flex items-center justify-between bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 px-4 py-3 rounded-2xl font-bold text-sm border border-violet-100 dark:border-violet-900/50 hover:bg-violet-100 transition">
                        <span className="flex items-center gap-2">
                            <Users size={16} /> Cadastrar como Ponto Parceiro
                        </span>
                        <ChevronRight size={16} />
                    </Link>
                </section>
            </div>
        </div>
    );
}
