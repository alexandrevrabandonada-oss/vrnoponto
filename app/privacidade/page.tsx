'use client';

import Link from 'next/link';
import { ShieldCheck, Lock, Bell, Trash2 } from 'lucide-react';
import { AppShell, PageHeader, Card, Button } from '@/components/ui';

export default function PrivacidadePage() {
    return (
        <AppShell title="Privacidade">

            <div className="max-w-md mx-auto py-6 space-y-6">
                <PageHeader
                    title="Privacidade"
                    subtitle="Explicação simples de como seus dados são usados no VR no Ponto."
                />

                <Card variant="surface2" className="!p-8 border-white/10 bg-white/[0.03] space-y-6 readable-content">
                    <div className="flex items-center gap-2 text-brand">
                        <ShieldCheck size={18} />
                        <p className="text-[11px] font-black uppercase tracking-widest">Resumo de Privacidade</p>
                    </div>
                    <ul className="space-y-4 text-base text-white/90 list-disc pl-5 leading-relaxed">
                        <li><strong>Zero burocracia</strong>: Não precisa de login ou senha.</li>
                        <li><strong>Anonimato</strong>: Nunca pedimos seu nome ou dados pessoais.</li>
                        <li><strong>Dados coletados</strong>: Apenas horários de ônibus e localização aproximada (GPS) para auditoria.</li>
                        <li><strong>Fotos</strong>: Envio de foto é 100% opcional e privado.</li>
                        <li><strong>Controle</strong>: Notificações são ativadas apenas se você autorizar no navegador.</li>
                    </ul>
                </Card>

                <Card variant="surface2" className="border-white/10 bg-white/[0.03] space-y-3">
                    <div className="flex items-center gap-2 text-brand">
                        <Lock size={16} />
                        <p className="text-[10px] font-black uppercase tracking-widest">Como protegemos</p>
                    </div>
                    <p className="text-sm text-white/80">
                        As fotos de prova ficam em bucket privado. Quando necessário, o acesso é feito por link assinado com validade curta.
                    </p>
                </Card>

                <Card variant="surface2" className="border-white/10 bg-white/[0.03] space-y-3">
                    <div className="flex items-center gap-2 text-brand">
                        <Trash2 size={16} />
                        <p className="text-[10px] font-black uppercase tracking-widest">Como apagar</p>
                    </div>
                    <p className="text-sm text-white/80">
                        Desinstalar o app (PWA) limpa o `device_id` local deste aparelho. Em breve, teremos solicitação direta de remoção pelo próprio app.
                    </p>
                </Card>

                <Card variant="surface2" className="border-white/10 bg-white/[0.03] space-y-3">
                    <div className="flex items-center gap-2 text-brand">
                        <Bell size={16} />
                        <p className="text-[10px] font-black uppercase tracking-widest">Controle de alertas</p>
                    </div>
                    <p className="text-sm text-white/80">
                        Você pode ativar ou desativar notificações a qualquer momento nas configurações do navegador.
                    </p>
                </Card>

                <div className="space-y-3">
                    <Link href="/no-ponto" className="block">
                        <Button variant="primary" className="w-full h-12 !text-[10px] font-black uppercase tracking-widest">
                            Estou no ponto
                        </Button>
                    </Link>
                    <Link href="/como-usar" className="block">
                        <Button variant="secondary" className="w-full h-12 !text-[10px] font-black uppercase tracking-widest">
                            Como usar
                        </Button>
                    </Link>
                </div>
            </div>
        </AppShell>
    );
}
