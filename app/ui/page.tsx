"use client";

import React, { useState } from 'react';
import { notFound } from 'next/navigation';
import {
    AppShell,
    PageHeader,
    Button,
    Card,
    Field,
    Input,
    Textarea,
    Select,
    Switch,
    RadioGroup,
    InlineAlert,
    EmptyState,
    Skeleton,
    SkeletonList,
    SkeletonTable,
    SkeletonMetric,
    ListItem,
    MetricRow,
    Divider,
    IconButton
} from '@/components/ui';
import { AlertCircle, FileText, Settings, Shield, Plus, ArrowRight, Activity, MapPin } from 'lucide-react';
import { useUiPrefs } from '@/lib/useUiPrefs';

export default function UIPlaygroundPage() {
    // Only show if explicitly enabled via env var, OR in local dev
    // Done strictly to ensure no leaks in prod unless opted in.
    if (process.env.NEXT_PUBLIC_UI_PLAYGROUND !== '1' && process.env.NODE_ENV === 'production') {
        notFound();
    }

    const [switchState, setSwitchState] = useState(false);
    const [radioValue, setRadioValue] = useState('opcao1');
    const [radioScale, setRadioScale] = useState('3');

    const { uiMode, density, setUiMode, setDensity } = useUiPrefs();

    return (
        <AppShell>
            <PageHeader
                title="UI Playground"
                subtitle="Sandbox interativo do Industrial UI Kit."
            />

            <div className="space-y-12 pb-12 pt-4">

                {/* 0. UI PREFERENCES */}
                <section className="space-y-6">
                    <div className="border-b border-zinc-800 pb-2">
                        <h2 className="text-2xl font-black font-industrial uppercase text-zinc-100 tracking-tight">UI Preferences (SSR/CSR)</h2>
                    </div>

                    <Card className="p-6 bg-surface-2 border-brand/20">
                        <div className="flex flex-col md:flex-row gap-8">
                            {/* Controls */}
                            <div className="w-full md:w-1/3 space-y-6 border-r border-white/5 pr-4">
                                <p className="text-sm text-zinc-400">
                                    Este modo é persistido via cookie (SSR) e atualiza instantaneamente as CSS Variables da raiz, garantindo zero flickering de tela.
                                </p>

                                <div className="space-y-3">
                                    <h3 className="font-industrial text-brand uppercase tracking-widest text-sm">Modo de Leitura</h3>
                                    <div className="flex bg-surface rounded-xl p-1 border border-white/5">
                                        <button
                                            onClick={() => setUiMode('default')}
                                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${uiMode === 'default' ? 'bg-surface-2 text-white shadow border border-white/10' : 'text-white/40 hover:text-white'}`}
                                        >Padrão</button>
                                        <button
                                            onClick={() => setUiMode('legivel')}
                                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${uiMode === 'legivel' ? 'bg-surface-2 text-white shadow border border-white/10' : 'text-white/40 hover:text-white'}`}
                                        >Legível</button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h3 className="font-industrial text-brand uppercase tracking-widest text-sm">Densidade</h3>
                                    <div className="flex bg-surface rounded-xl p-1 border border-white/5">
                                        <button
                                            onClick={() => setDensity('comfort')}
                                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${density === 'comfort' ? 'bg-surface-2 text-white shadow border border-white/10' : 'text-white/40 hover:text-white'}`}
                                        >Conforto</button>
                                        <button
                                            onClick={() => setDensity('compact')}
                                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${density === 'compact' ? 'bg-surface-2 text-white shadow border border-white/10' : 'text-white/40 hover:text-white'}`}
                                        >Compacto</button>
                                    </div>
                                </div>
                            </div>

                            {/* Live Preview */}
                            <div className="w-full md:w-2/3 space-y-4">
                                <h3 className="font-industrial text-brand uppercase tracking-widest text-sm">Live Preview</h3>
                                <Card className="p-0 overflow-hidden glass">
                                    <div className="p-4 space-y-4">
                                        <div className="flex gap-4 items-end">
                                            <Field label="Exemplo de Input" className="flex-1">
                                                <Input placeholder="Digite algo aqui..." />
                                            </Field>
                                            <Button variant="primary">Ação</Button>
                                        </div>
                                    </div>
                                    <Divider />
                                    <ListItem
                                        title="Teste de Lista"
                                        description="Auditoria de Interface"
                                        leftIcon={<Activity />}
                                        rightElement={<span className="font-industrial text-lg text-white">100%</span>}
                                    />
                                    <Divider />
                                    <div className="p-4">
                                        <MetricRow
                                            label="Impacto do Redimensionamento"
                                            value="Total"
                                            delta="positive"
                                            deltaLabel="Responsivo"
                                            tone="brand"
                                        />
                                    </div>
                                </Card>
                            </div>
                        </div>
                    </Card>
                </section>

                {/* 1. BUTTONS */}
                <section className="space-y-6">
                    <div className="border-b border-zinc-800 pb-2">
                        <h2 className="text-2xl font-black font-industrial uppercase text-zinc-100 tracking-tight">Botões & Ações</h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <Button variant="primary">Principal</Button>
                        <Button variant="secondary">Secundário</Button>
                        <Button variant="secondary" className="border-danger text-danger hover:bg-danger/10">Destrutivo</Button>
                        <Button variant="ghost">Fantasma</Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <Button variant="primary" icon={<Plus />}>Com Ícone Escala</Button>
                        <Button variant="secondary" loading>Carregando...</Button>
                        <Button variant="primary" disabled>Desabilitado</Button>
                        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-2 rounded-xl">
                            <IconButton icon={<Settings />} aria-label="Config" />
                            <IconButton icon={<ArrowRight />} variant="brand" aria-label="Avançar" />
                            <IconButton icon={<AlertCircle />} variant="ghost" className="text-danger" aria-label="Alerta" />
                        </div>
                    </div>
                </section>

                {/* 2. CARDS */}
                <section className="space-y-6">
                    <div className="border-b border-zinc-800 pb-2">
                        <h2 className="text-2xl font-black font-industrial uppercase text-zinc-100 tracking-tight">Cards & Superfícies</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card variant="surface" className="p-6">
                            <h3 className="text-lg font-bold mb-2">Surface 1 (Padrão)</h3>
                            <p className="text-zinc-400 text-sm">Fundo base para apresentar informações de primeiro nível.</p>
                        </Card>
                        <Card variant="surface2" className="p-6">
                            <h3 className="text-lg font-bold mb-2">Surface 2 (Elevado)</h3>
                            <p className="text-zinc-400 text-sm">Fundo mais leve para informações destacadas ou modais.</p>
                        </Card>
                        <Card variant="surface" hasTexture className="p-6 md:col-span-2 border-brand/50">
                            <h3 className="text-lg text-white font-bold mb-2 uppercase font-industrial text-brand">Surface Brand + Texture</h3>
                            <p className="text-zinc-400 text-sm font-medium">Card temático da marca com textura noise inserida nativamente.</p>
                        </Card>
                        <Card variant="surface" className="p-6 md:col-span-2 hover:scale-[1.01] transition-transform cursor-pointer">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold">Interactive Card</h3>
                                    <p className="text-zinc-400 text-sm">Possui hover states e escala ativa.</p>
                                </div>
                                <ArrowRight className="text-zinc-500" />
                            </div>
                        </Card>
                    </div>
                </section>

                {/* 3. ALERTS & FEEDBACK */}
                <section className="space-y-6">
                    <div className="border-b border-zinc-800 pb-2">
                        <h2 className="text-2xl font-black font-industrial uppercase text-zinc-100 tracking-tight">Feedbacks (Inline Alerts)</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InlineAlert variant="info">Sistema operando normalmente. Dados atualizados há 5 min.</InlineAlert>
                        <InlineAlert variant="success">Ação registrada com sucesso na blockchain (L3 Oficial).</InlineAlert>
                        <InlineAlert variant="warning">Alguns pontos da sua rede estão com instabilidade.</InlineAlert>
                        <InlineAlert variant="error">Falha de conexão. O servidor não respondeu a tempo.</InlineAlert>
                    </div>
                </section>

                {/* 4. FORMS */}
                <section className="space-y-6">
                    <div className="border-b border-zinc-800 pb-2">
                        <h2 className="text-2xl font-black font-industrial uppercase text-zinc-100 tracking-tight">Formulários & Inputs</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                        <div className="space-y-6">
                            <Field label="Nome do Ponto" hint="Digite o nome oficial como está na placa.">
                                <Input placeholder="Av. Amaral Peixoto, 100" />
                            </Field>

                            <Field label="Identificador" error="Este campo é obrigatório e deve ter 4 dígitos.">
                                <Input placeholder="1234" defaultValue="12" className="border-red-500/50 focus:border-red-500 focus:ring-red-500/20" />
                            </Field>

                            <Field label="Categoria da Parada">
                                <Select>
                                    <option value="brt">BRT / Corredor</option>
                                    <option value="comum">Ponto Comum</option>
                                    <option value="abrigo">Abrigo Coberto</option>
                                </Select>
                            </Field>

                            <Field label="Monitoramento Ativo" hint="Ative para receber alertas Push sobre este ponto.">
                                <Switch
                                    checked={switchState}
                                    onChange={setSwitchState}
                                />
                            </Field>

                            <Field label="Observações Extra (Opcional)">
                                <Textarea placeholder="Detalhes do que você observou no local..." rows={3} />
                            </Field>
                        </div>

                        <div className="space-y-8">
                            <Field label="Tipo de Relato (Card Radio)" hint="Escolha o tipo de problema encontrado.">
                                <RadioGroup
                                    name="tipo-problema"
                                    orientation="vertical"
                                    value={radioValue}
                                    onChange={setRadioValue}
                                    options={[
                                        { value: 'opcao1', label: 'Atraso na Linha', description: 'Ônibus demorou mais que o esperado.' },
                                        { value: 'opcao2', label: 'Superlotação', description: 'Não foi possível embarcar.' },
                                        { value: 'opcao3', label: 'Estrutura Danificada', description: 'Problema físico no ponto.' },
                                    ]}
                                />
                            </Field>

                            <Field label="Nível de Impacto (Scale Radio)" hint="De 1 (Baixo) a 5 (Crítico).">
                                <RadioGroup
                                    name="impacto"
                                    orientation="horizontal"
                                    value={radioScale}
                                    onChange={setRadioScale}
                                    options={[
                                        { value: '1', label: '1' },
                                        { value: '2', label: '2' },
                                        { value: '3', label: '3' },
                                        { value: '4', label: '4' },
                                        { value: '5', label: '5' },
                                    ]}
                                />
                            </Field>

                            <Field label="Inputs Desativados">
                                <Input placeholder="Você não pode digitar aqui" disabled />
                            </Field>
                        </div>
                    </div>
                </section>

                {/* 5. LISTS & DATA */}
                <section className="space-y-6">
                    <div className="border-b border-zinc-800 pb-2">
                        <h2 className="text-2xl font-black font-industrial uppercase text-zinc-100 tracking-tight">Listas & Métricas</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <Card className="p-0 overflow-hidden">
                            <ListItem
                                title="Linha 315 - Retiro"
                                description="Atualizado há 2 min"
                                leftIcon={<Activity />}
                                onClick={() => { }}
                                tone="danger"
                                rightElement={<span className="font-industrial font-bold">+18m</span>}
                            />
                            <Divider />
                            <ListItem
                                title="Centro Operacional"
                                description="Zona Central"
                                leftIcon={<Shield />}
                                onClick={() => { }}
                                tone="brand"
                                selected
                                rightElement={<span className="text-[10px] font-black uppercase tracking-widest">Online</span>}
                            />
                            <Divider />
                            <ListItem
                                title="Terminal Vila"
                                description="12 pontos ativos"
                                leftIcon={<MapPin />}
                                tone="neutral"
                                className="opacity-50 pointer-events-none"
                            />
                        </Card>

                        <Card className="p-4 space-y-2">
                            <MetricRow
                                label="Tempo de Espera Máximo"
                                value="45"
                                sublabel="min"
                                delta="negative"
                                deltaLabel="12m"
                                tone="danger"
                            />
                            <MetricRow
                                label="Veículos na Rota"
                                value="28"
                                delta="neutral"
                                deltaLabel="2"
                            />
                            <MetricRow
                                label="Confiabilidade (L3)"
                                value="92"
                                sublabel="%"
                                delta="positive"
                                deltaLabel="estável"
                                tone="brand"
                            />
                        </Card>
                    </div>
                </section>

                {/* 6. STATES (Loading & Empty) */}
                <section className="space-y-6">
                    <div className="border-b border-zinc-800 pb-2">
                        <h2 className="text-2xl font-black font-industrial uppercase text-zinc-100 tracking-tight">Estados (Loading / Empty)</h2>
                    </div>

                    <div className="space-y-8">
                        <div>
                            <h3 className="text-xs font-industrial uppercase text-zinc-400 mb-3 tracking-widest pl-1">Variantes de Skeleton Industrial</h3>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* List Skeleton */}
                                <div>
                                    <h4 className="text-[10px] font-black tracking-widest text-brand mb-2 uppercase">SkeletonList</h4>
                                    <SkeletonList items={3} />
                                </div>

                                {/* Table Skeleton */}
                                <div>
                                    <h4 className="text-[10px] font-black tracking-widest text-brand mb-2 uppercase">SkeletonTable</h4>
                                    <SkeletonTable rows={3} />
                                </div>

                                {/* Metric Grid */}
                                <div className="lg:col-span-2">
                                    <h4 className="text-[10px] font-black tracking-widest text-brand mb-2 uppercase">SkeletonMetric (Grid)</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <SkeletonMetric />
                                        <SkeletonMetric />
                                        <SkeletonMetric />
                                        <SkeletonMetric />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Divider />

                        <div>
                            <h3 className="text-xs font-industrial uppercase text-zinc-400 mb-3 tracking-widest pl-1">Blocos Mistos e Estados Vazios</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card className="p-6">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <Skeleton className="w-12 h-12 rounded-full shrink-0" />
                                            <div className="space-y-2 flex-1">
                                                <Skeleton className="w-3/4 h-4 rounded" />
                                                <Skeleton className="w-1/2 h-3 rounded" />
                                            </div>
                                        </div>
                                        <Skeleton className="h-24 w-full rounded-xl mt-4" />
                                    </div>
                                </Card>

                                <Card className="p-0">
                                    <EmptyState
                                        icon={FileText}
                                        title="Nenhum registro encontrado"
                                        description="Não há relatórios arquivados para esta linha nos últimos 7 dias."
                                        actionLabel="Criar Registros"
                                        onAction={() => { }}
                                    />
                                </Card>
                            </div>
                        </div>
                    </div>
                </section>

            </div>
        </AppShell>
    );
}
