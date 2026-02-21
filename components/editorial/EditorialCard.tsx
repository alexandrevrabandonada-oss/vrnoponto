'use client';

import { useState, useCallback } from 'react';
import {
    Check,
    Type,
    MessageSquare,
    Hash,
    ChevronRight,
    Sparkles,
    Zap,
    BookOpen,
    Megaphone
} from 'lucide-react';
import { EditorialTone } from '@/lib/editorial/templates';

interface EditorialCardProps<T> {
    data: T;
    generator: (data: T, tone: EditorialTone) => {
        caption: string;
        shortCaption: string;
        hashtags: string;
        cta: string;
    };
    title?: string;
}

export function EditorialCard<T>({ data, generator, title = "Kit Editorial: Legenda Pronta" }: EditorialCardProps<T>) {
    const [tone, setTone] = useState<EditorialTone>(() => {
        // Lazy initializer avoids setState inside effect (react-hooks/set-state-in-effect)
        if (typeof window === 'undefined') return 'direct';
        const saved = localStorage.getItem('vrnp_editorial_tone') as EditorialTone;
        return (saved && ['direct', 'explanatory', 'convocatory'].includes(saved)) ? saved : 'direct';
    });
    const [copied, setCopied] = useState<string | null>(null);

    const handleToneChange = useCallback((newTone: EditorialTone) => {
        setTone(newTone);
        localStorage.setItem('vrnp_editorial_tone', newTone);
    }, []);

    const strings = generator(data, tone);

    const copyToClipboard = async (text: string, type: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(type);
            setTimeout(() => setCopied(null), 2000);
        } catch (err) {
            console.error('Failed to copy!', err);
        }
    };

    const toneConfig = {
        direct: { icon: Zap, label: "Militante", color: "text-red-600 bg-red-50 border-red-100" },
        explanatory: { icon: BookOpen, label: "Explicativo", color: "text-blue-600 bg-blue-50 border-blue-100" },
        convocatory: { icon: Megaphone, label: "Convocatório", color: "text-indigo-600 bg-indigo-50 border-indigo-100" }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden group">
            <div className="p-6 border-b border-gray-50 dark:border-gray-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-200 dark:shadow-none">
                        <Sparkles size={18} />
                    </div>
                    <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-tight">{title}</h3>
                </div>

                {/* Tone Selector */}
                <div className="flex bg-gray-50 dark:bg-gray-900 p-1 rounded-2xl border border-gray-100 dark:border-gray-800">
                    {(Object.keys(toneConfig) as EditorialTone[]).map((t) => {
                        const Config = toneConfig[t];
                        const Icon = Config.icon;
                        const active = tone === t;
                        return (
                            <button
                                key={t}
                                onClick={() => handleToneChange(t)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${active
                                    ? 'bg-white dark:bg-gray-800 text-indigo-600 shadow-sm shadow-gray-200 dark:shadow-none translate-y-[-1px]'
                                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                                    }`}
                                title={Config.label}
                            >
                                <Icon size={14} />
                                <span className="hidden md:inline">{Config.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="p-6 bg-gray-50/50 dark:bg-gray-800/20">
                <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-inner text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed relative min-h-[120px]">
                    {strings.caption}
                    <div className="mt-4 pt-4 border-t border-dashed border-gray-100 dark:border-gray-800 text-indigo-600 dark:text-indigo-400 font-bold">
                        {strings.cta}
                    </div>
                    <div className="mt-2 text-gray-400 text-xs italic">
                        {strings.hashtags}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                    <button
                        onClick={() => copyToClipboard(`${strings.caption}\n\n${strings.cta}\n\n${strings.hashtags}`, 'long')}
                        className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95 text-xs"
                    >
                        {copied === 'long' ? <Check size={16} /> : <MessageSquare size={16} />}
                        {copied === 'long' ? 'Copiado!' : 'Copiar Legenda'}
                    </button>

                    <button
                        onClick={() => copyToClipboard(`${strings.shortCaption}\n\n${strings.cta}`, 'short')}
                        className="flex items-center justify-center gap-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 font-bold py-3 px-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-all active:scale-95 text-xs"
                    >
                        {copied === 'short' ? <Check size={16} /> : <Type size={16} />}
                        {copied === 'short' ? 'Copiado!' : 'Versão Curta'}
                    </button>

                    <button
                        onClick={() => copyToClipboard(strings.hashtags, 'tags')}
                        className="flex items-center justify-center gap-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 font-bold py-3 px-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-all active:scale-95 text-xs"
                    >
                        {copied === 'tags' ? <Check size={16} /> : <Hash size={16} />}
                        {copied === 'tags' ? 'Hashtags' : 'Hashtags'}
                    </button>
                </div>
            </div>

            <div className="px-6 py-3 bg-indigo-50/50 dark:bg-indigo-900/10 text-[10px] text-indigo-400 flex items-center gap-2">
                <ChevronRight size={12} />
                Pronto para postar no Instagram, LinkedIn ou WhatsApp.
            </div>
        </div>
    );
}
