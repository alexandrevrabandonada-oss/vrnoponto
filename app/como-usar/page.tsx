'use client';

import { AppShell, PageHeader, Card, Button } from '@/components/ui';

export default function ComoUsar() {
    return (
        <AppShell title="COMO USAR">
            <PageHeader
                title="Como usar em 30 segundos"
                subtitle="Poucos toques. Dado útil para pressionar por ônibus melhor."
            />

            <div className="space-y-6">
                <Card className="!p-6 border-brand/20 bg-brand/5">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">Em 10s</p>
                    <h2 className="mt-2 text-2xl font-industrial italic uppercase text-white">Estou no ponto → registro de 1 toque</h2>
                    <p className="mt-2 text-sm text-white/80">
                        Abra o check-in, confirme o ponto e registre. Isso já gera prova de campo.
                    </p>
                </Card>

                <Card className="!p-6 border-white/10 bg-white/[0.02]">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">Em 30s</p>
                    <h2 className="mt-2 text-2xl font-industrial italic uppercase text-white">Registre em 2 pontos no dia</h2>
                    <p className="mt-2 text-sm text-white/80">
                        Dois registros em pontos diferentes melhoram muito a leitura da cidade e reduzem ruído.
                    </p>
                </Card>

                <Card className="!p-6 border-white/10 bg-white/[0.02]">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">Impacto</p>
                    <h2 className="mt-2 text-2xl font-industrial italic uppercase text-white">Ver ponto e bairro, depois compartilhar boletim</h2>
                    <p className="mt-2 text-sm text-white/80">
                        Quando você compartilha o boletim, transforma relato local em pressão pública.
                    </p>
                </Card>

                <Card className="!p-6 border-brand/20 bg-black/40">
                    <h3 className="text-lg font-industrial italic uppercase text-brand">Por que isso importa</h3>
                    <p className="mt-2 text-sm text-white/85">
                        Ônibus sem fiscalização vira abandono. Registro cidadão é ferramenta de cobrança real.
                    </p>
                </Card>

                <Card className="!p-6 border-white/10 bg-white/[0.02]">
                    <h3 className="text-lg font-industrial italic uppercase text-white">Sem dados ainda?</h3>
                    <p className="mt-2 text-sm text-white/80">
                        Quando a base está começando, cada registro conta. Veja como ativar a cidade em poucos minutos.
                    </p>
                    <a href="/primeiros-dados" className="mt-3 inline-block text-sm font-bold text-brand hover:text-[#E5B800]">
                        Ir para Primeiros Dados
                    </a>
                </Card>

                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                    <Button href="/no-ponto" className="sm:flex-1">
                        Estou no ponto
                    </Button>
                    <Button href="/mapa" variant="secondary" className="sm:flex-1">
                        Ver mapa
                    </Button>
                    <Button href="/boletim" variant="secondary" className="sm:flex-1">
                        Ver boletim
                    </Button>
                </div>
            </div>
        </AppShell>
    );
}
