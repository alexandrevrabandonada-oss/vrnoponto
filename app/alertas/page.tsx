import { AppShell, PageHeader } from '@/components/ui';
import { PushOptInCard } from '@/components/push/PushOptInCard';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Alertas no Celular | VR no Ponto',
    description: 'Ative notificações para receber alertas sobre os ônibus de Volta Redonda.'
};

export default function AlertasPage() {
    return (
        <AppShell>
            <PageHeader
                title="Alertas no Celular"
                subtitle="Receba análises diárias ou comunicados críticos diretamente na tela do seu celular através de notificações seguras do navegador."
            />

            <div className="max-w-2xl mx-auto space-y-6 pt-4 pb-12">
                <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl text-sm leading-relaxed shadow-sm">
                    <strong>📱 Dica:</strong> Para a melhor experiência, abra as opções do seu navegador de celular e escolha <strong>&quot;Adicionar à Tela Inicial&quot;</strong>. O VR no Ponto funcionará como um aplicativo nativo garantindo o recebimento correto das mensagens.
                </div>

                <div className="bg-white border border-gray-200 p-4 rounded-2xl text-sm text-gray-700 shadow-sm">
                    <p className="font-bold text-gray-900 mb-2">Exemplos do que chega no celular:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Resumo diário com os principais alertas de espera e frequência da sua região.</li>
                        <li>Aviso crítico quando uma linha/ponto dispara atraso fora do padrão normal.</li>
                    </ul>
                </div>

                <PushOptInCard />

                <div className="text-xs text-center text-gray-500 max-w-lg mx-auto leading-relaxed pt-8 mt-8 border-t border-gray-100">
                    O VR no Ponto valoriza sua privacidade. Nenhuma identificação pessoal (PII), telefone ou e-mail é exigido para ativação dos alertas. Todo o bloqueio, inscrição ou remoção é instantaneamente garantido pelos canais oficiais de configuração do seu sistema operacional. Ao cancelar as notificações as chaves de acesso são destruídas permanentemente.
                </div>
            </div>
        </AppShell>
    );
}
