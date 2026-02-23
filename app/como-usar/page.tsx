'use client';

import { Shield, MapPin, Zap, ShieldCheck, Heart, Share2 } from 'lucide-react';
import { AppShell, PageHeader, Card, Divider, Button } from '@/components/ui';

export default function ComoUsar() {
    return (
        <AppShell title="GUIA DO USUÁRIO">
            <PageHeader
                title="Como Funciona"
                subtitle="O seu relato é a prova de quem espera"
            />

            <div className="space-y-12">
                <section className="space-y-6">
                    <Card variant="surface2" className="!p-8 border-brand/20 bg-brand/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                            <Zap size={120} className="text-brand" />
                        </div>
                        <div className="relative z-10 space-y-4">
                            <h2 className="text-3xl font-industrial italic uppercase leading-none text-brand">O Poder da Auditoria</h2>
                            <p className="text-sm font-bold text-white/80 leading-relaxed uppercase tracking-tight max-w-lg">
                                O VR no Ponto não é apenas um app de horários. É uma ferramenta de <span className="text-brand">pressão popular</span> que prova, com dados geolocalizados, quando as empresas de ônibus não cumprem o prometido.
                            </p>
                        </div>
                    </Card>
                </section>

                <Divider label="FLUXO DE REGISTRO" />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="!p-6 space-y-4 border-white/5 bg-white/[0.02]">
                        <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center">
                            <MapPin className="text-brand" size={20} />
                        </div>
                        <h3 className="font-industrial text-lg italic uppercase tracking-widest text-white">1. Localização</h3>
                        <p className="text-[11px] text-muted font-black uppercase tracking-tight leading-relaxed">
                            O sistema detecta automaticamente em qual ponto você está para validar seu relato.
                        </p>
                    </Card>

                    <Card className="!p-6 space-y-4 border-white/5 bg-white/[0.02]">
                        <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center">
                            <Zap className="text-brand" size={20} />
                        </div>
                        <h3 className="font-industrial text-lg italic uppercase tracking-widest text-white">2. Relato Simples</h3>
                        <p className="text-[11px] text-muted font-black uppercase tracking-tight leading-relaxed">
                            Basta um toque: &quot;Passou agora&quot; ou &quot;Entrei&quot;. Rápido e direto na parada.
                        </p>
                    </Card>

                    <Card className="!p-6 space-y-4 border-white/5 bg-white/[0.02]">
                        <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center">
                            <ShieldCheck className="text-brand" size={20} />
                        </div>
                        <h3 className="font-industrial text-lg italic uppercase tracking-widest text-white">3. Auditoria Coletiva</h3>
                        <p className="text-[11px] text-muted font-black uppercase tracking-tight leading-relaxed">
                            Seu dado se une ao de outros para formar uma prova real da qualidade do serviço.
                        </p>
                    </Card>
                </div>

                <Divider label="NÍVEIS DE CONFIANÇA" />

                <div className="space-y-4">
                    <Card variant="surface2" className="flex items-start gap-4 border-white/5 !p-6">
                        <div className="mt-1 px-2 py-0.5 bg-white/10 text-white font-mono text-[10px] font-bold rounded tracking-widest uppercase">L1</div>
                        <div className="space-y-1">
                            <h4 className="font-industrial text-lg italic uppercase text-white/90">Relato Individual</h4>
                            <p className="text-[11px] text-muted font-medium uppercase tracking-tight leading-relaxed">
                                Você relata um evento. É o ponto de partida da auditoria.
                            </p>
                        </div>
                    </Card>

                    <Card variant="surface2" className="flex items-start gap-4 border-brand/20 !p-6">
                        <div className="mt-1 px-2 py-0.5 bg-brand text-black font-mono text-[10px] font-bold rounded tracking-widest uppercase">L2</div>
                        <div className="space-y-1">
                            <h4 className="font-industrial text-lg italic uppercase text-brand">Consenso Social</h4>
                            <p className="text-[11px] text-muted font-medium uppercase tracking-tight leading-relaxed">
                                Mais pessoas no mesmo ponto confirmam o evento em horários próximos.
                            </p>
                        </div>
                    </Card>

                    <Card variant="surface2" className="flex items-start gap-4 border-emerald-500/20 !p-6">
                        <div className="mt-1 px-2 py-0.5 bg-emerald-500 text-white font-mono text-[10px] font-bold rounded tracking-widest uppercase">L3</div>
                        <div className="space-y-1">
                            <h4 className="font-industrial text-lg italic uppercase text-emerald-400">Prova Verificada</h4>
                            <p className="text-[11px] text-muted font-medium uppercase tracking-tight leading-relaxed">
                                Relato validado via Trajeto ou QR Code em parceiro oficial.
                            </p>
                        </div>
                    </Card>
                </div>

                <Divider label="POR QUE USAR?" />

                <Card className="!p-10 text-center space-y-6 bg-white/[0.02] border-white/5">
                    <Heart className="mx-auto text-danger animate-pulse" size={32} fill="currentColor" />
                    <div className="space-y-2">
                        <h2 className="text-3xl font-industrial italic uppercase leading-none text-white">Auditoria Transparente</h2>
                        <p className="text-sm font-bold text-muted uppercase tracking-tight leading-relaxed max-w-md mx-auto">
                            Ao usar o VR no Ponto, você alimenta um banco de dados público que expõe a realidade da nossa mobilidade.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Card variant="surface2" className="flex items-center gap-2 !p-3 !bg-white/5 border-white/10">
                            <Shield size={16} className="text-brand" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/60">Privacidade 100%</span>
                        </Card>
                        <Card variant="surface2" className="flex items-center gap-2 !p-3 !bg-white/5 border-white/10">
                            <Share2 size={16} className="text-brand" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/60">Dados Abertos</span>
                        </Card>
                    </div>
                </Card>

                <div className="pt-4 flex justify-center">
                    <Button
                        href="/registrar"
                        className="!bg-brand !text-black !h-14 !px-12 !text-lg hover:!scale-105 transition-all shadow-xl shadow-brand/20"
                    >
                        Começar Auditoria
                    </Button>
                </div>

                <footer className="text-center pb-8 opacity-20 hover:opacity-100 transition-opacity">
                    <p className="text-[10px] font-industrial tracking-[0.4em] uppercase text-muted">Vila Rica no Ponto — {new Date().getFullYear()}</p>
                </footer>
            </div>
        </AppShell>
    );
}
