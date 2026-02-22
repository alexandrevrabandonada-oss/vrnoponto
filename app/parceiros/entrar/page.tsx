'use client';

import { useState } from 'react';
import {
    CheckCircle2, Navigation, ShieldCheck,
    ArrowLeft, Store, Info
} from 'lucide-react';
import Link from 'next/link';
import { TelemetryTracker } from '@/components/TelemetryTracker';
import {
    AppShell, PageHeader, Button, Card, Divider,
    Field, Input, Select, Textarea, Switch
} from '@/components/ui';

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

        fetch('/api/telemetry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: 'click_partner_apply_submit' }),
        }).catch(() => { });

        if (!form.authorized) {
            setError('VOCÊ PRECISA CONFIRMAR A AUTORIZAÇÃO PARA PROSSEGUIR.');
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
            <AppShell title="PEDIDO ENVIADO">
                <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-6">
                    <div className="w-24 h-24 bg-brand/10 border border-brand/20 rounded-full flex items-center justify-center animate-scale-in">
                        <CheckCircle2 size={48} className="text-brand" />
                    </div>
                    <h1 className="text-2xl font-black uppercase tracking-tighter text-white">
                        Solicitação Enviada!
                    </h1>
                    <p className="text-muted font-medium leading-relaxed max-w-xs">
                        Nossa equipe entrará em contato em breve via WhatsApp ou Instagram.
                    </p>
                    <Link href="/parceiros" className="w-full max-w-xs">
                        <Button className="w-full">Voltar para Parceiros</Button>
                    </Link>
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell title="ADESÃO PARCEIRO">
            <TelemetryTracker eventName="page_view_partner_apply" />

            <Link href="/parceiros" className="inline-flex items-center gap-2 text-brand text-[10px] font-black uppercase tracking-widest mb-6 hover:opacity-80 transition">
                <ArrowLeft size={14} /> Voltar
            </Link>

            <PageHeader
                title="Novo Parceiro"
                subtitle="Leva menos de 2 minutos e não tem custo."
            />

            <form onSubmit={handleSubmit} className="space-y-8 pb-10">
                <input type="text" name="website" value={form.website} onChange={set('website')} className="hidden" aria-hidden="true" tabIndex={-1} autoComplete="off" />

                <div className="space-y-6">
                    <Divider label="SOBRE O LOCAL" />

                    <Field
                        label="Nome do Estabelecimento / Entidade"
                        hint="Como as pessoas conhecem este lugar?"
                        error={error?.includes('nome') ? error : undefined}
                    >
                        <Input
                            id="name"
                            required
                            value={form.name}
                            onChange={set('name')}
                            placeholder="Ex: Padaria da Vila, Sindicato..."
                        />
                    </Field>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <Field label="Bairro" hint="Onde fica?">
                            <Input
                                id="neighborhood"
                                required
                                value={form.neighborhood}
                                onChange={set('neighborhood')}
                                placeholder="Vila Rica, Centro..."
                            />
                        </Field>

                        <Field label="Categoria" hint="Tipo de local">
                            <Select
                                id="category"
                                value={form.category}
                                onChange={set('category')}
                            >
                                {CATEGORIES.map(c => <option key={c.value} value={c.value} className="bg-zinc-900">{c.label}</option>)}
                            </Select>
                        </Field>
                    </div>

                    <Field label="Endereço (Opcional)" hint="Rua e número aproximado">
                        <Input
                            id="address"
                            value={form.address}
                            onChange={set('address')}
                            placeholder="Rua 33, nº 10"
                        />
                    </Field>

                    <Field label="Localização GPS" hint="Ajuda na precisão do mapa">
                        <div className="flex items-center gap-4">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={getLocation}
                                loading={gettingLocation}
                                className="flex-1 h-12 !text-xs"
                                icon={<Navigation size={14} />}
                            >
                                Capturar GPS
                            </Button>
                            {form.lat && (
                                <div className="flex items-center gap-2 text-brand font-black text-[10px] uppercase">
                                    <CheckCircle2 size={14} /> Ativado
                                </div>
                            )}
                        </div>
                    </Field>
                </div>

                <div className="space-y-6">
                    <Divider label="CONTATO" />

                    <Field label="Responsável" hint="Com quem falaremos?">
                        <Input
                            id="contact_name"
                            value={form.contact_name}
                            onChange={set('contact_name')}
                            placeholder="Seu nome"
                        />
                    </Field>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <Field label="WhatsApp" hint="Número com DDD">
                            <Input
                                id="contact_phone"
                                type="tel"
                                value={form.contact_phone}
                                onChange={set('contact_phone')}
                                placeholder="(24) 9 9999-9999"
                            />
                        </Field>
                        <Field label="Instagram" hint="@perfil">
                            <Input
                                id="contact_instagram"
                                value={form.contact_instagram}
                                onChange={set('contact_instagram')}
                                placeholder="@local_ou_seu"
                            />
                        </Field>
                    </div>
                </div>

                <div className="space-y-6">
                    <Divider label="MENSAGEM EXTRA" />
                    <Field label="Motivação" hint="Opcional: conte algo sobre seu local">
                        <Textarea
                            id="message"
                            value={form.message}
                            onChange={set('message')}
                            placeholder="Ex: Gostaria de ajudar a vizinhança..."
                        />
                    </Field>
                </div>

                <div className="space-y-4">
                    <Card variant="surface2" className="border-brand/10">
                        <div className="flex items-start gap-4">
                            <Switch
                                id="authorized"
                                checked={form.authorized}
                                onChange={(val) => setForm(p => ({ ...p, authorized: val }))}
                            />
                            <div className="flex-1 space-y-1">
                                <label
                                    htmlFor="authorized"
                                    className="block text-xs font-black uppercase tracking-tight text-white leading-tight"
                                >
                                    Autorizo a Instalação
                                </label>
                                <p className="text-[10px] font-medium text-muted uppercase tracking-tight opacity-70">
                                    Confirmo que tenho permissão para expor o material informativo no local indicado.
                                </p>
                            </div>
                        </div>
                    </Card>

                    {error && (
                        <div className="bg-danger/10 border border-danger/20 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                            <Info size={16} className="text-danger shrink-0" />
                            <p className="text-[11px] font-bold text-danger uppercase tracking-tight leading-tight">
                                {error}
                            </p>
                        </div>
                    )}

                    <Button
                        type="submit"
                        loading={loading}
                        className="w-full h-16 !text-lg shadow-xl shadow-brand/10"
                        icon={<ShieldCheck size={20} />}
                        iconPosition="right"
                    >
                        Solicitar Adesão
                    </Button>
                </div>
            </form>
        </AppShell>
    );
}
