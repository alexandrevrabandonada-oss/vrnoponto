'use client';

import { useState } from 'react';
import { useDeviceId } from '@/hooks/useDeviceId';
import { RatingModal } from '@/components/RatingModal';
import { QRScanner } from '@/components/QRScanner';
import { ShieldCheck, QrCode } from 'lucide-react';
import { HelpModal } from '@/components/HelpModal';
import { AppShell, PageHeader, Button, Card, Divider, Field, Textarea } from '@/components/ui';

const MOCK_LINE_ID = '11111111-1111-1111-1111-111111111111';
const MOCK_STOP_ID = '22222222-2222-2222-2222-222222222222';

export default function Registrar() {
    const deviceId = useDeviceId();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [lastTrust, setLastTrust] = useState<string | null>(null);
    const [lastMethod, setLastMethod] = useState<string | null>(null);
    const [observation, setObservation] = useState('');

    const registerEvent = async (eventType: string) => {
        if (!deviceId) return;

        setIsSubmitting(true);
        setMessage('');
        setLastTrust(null);
        setLastMethod(null);

        try {
            const res = await fetch('/api/events/record', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deviceId,
                    stopId: MOCK_STOP_ID,
                    lineId: MOCK_LINE_ID,
                    eventType,
                    metadata: observation ? { observation } : undefined
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro desconhecido');

            const trust = data.event?.trust_level || 'L1';
            const method = data.event?.trust_method || 'L1';
            setLastTrust(trust);
            setLastMethod(method);

            let successMsg = "RELATO ENVIADO!";
            if (trust === 'L2') successMsg = "CONFIRMADO PELA COMUNIDADE!";
            if (trust === 'L3') successMsg = `PROVA FORTE ATIVADA VIA ${method}!`;

            setMessage(successMsg);

            if (eventType === 'boarding' || eventType === 'passed_by') {
                setIsModalOpen(true);
            }
        } catch (err: unknown) {
            const errMessage = err instanceof Error ? err.message : 'Erro desconhecido';
            setMessage('ERRO NO REGISTRO: ' + errMessage.toUpperCase());
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AppShell title="REGISTRAR AUDITORIA">
            <PageHeader
                title="Relatar Agora"
                subtitle="Sua posição e horário validam o serviço"
            />

            <div className="space-y-6">
                <Card variant="surface2" className="border-brand/10 bg-brand/5">
                    <p className="text-xs font-black uppercase tracking-tight text-brand/80 leading-relaxed italic">
                        Ponto Detectado: <span className="text-white">Centro (PT-001)</span> <br />
                        Linha Provável: <span className="text-white">P200 - Vila Rica</span>
                    </p>
                </Card>

                <div className="grid grid-cols-1 gap-4">
                    <Button
                        onClick={() => registerEvent('passed_by')}
                        loading={isSubmitting}
                        disabled={!deviceId}
                        className="h-20 !text-xl !bg-orange-600 hover:!bg-orange-500 !text-white"
                        icon={<QrCode size={24} />}
                        iconPosition="right"
                    >
                        Ônibus Passou Agora
                    </Button>

                    <Button
                        onClick={() => registerEvent('boarding')}
                        loading={isSubmitting}
                        disabled={!deviceId}
                        className="h-20 !text-xl !bg-emerald-600 hover:!bg-emerald-500 !text-white"
                        icon={<ShieldCheck size={24} />}
                        iconPosition="right"
                    >
                        Entrei (Embarquei)
                    </Button>

                    <Button
                        onClick={() => registerEvent('alighted')}
                        variant="secondary"
                        loading={isSubmitting}
                        disabled={!deviceId}
                        className="h-16 !text-lg opacity-80"
                    >
                        Desci Agora
                    </Button>
                </div>

                <Divider label="DETALHES ADICIONAIS" />

                <Field
                    label="Observação Opcional"
                    hint="Algo incomum? Ex: Ônibus extra, mudou itinerário..."
                >
                    <Textarea
                        id="observation"
                        value={observation}
                        onChange={(e) => setObservation(e.target.value)}
                        placeholder="Escreva aqui..."
                        className="!min-h-[80px]"
                    />
                </Field>

                {message && (
                    <div className={`p-6 rounded-2xl text-center font-industrial text-lg tracking-widest animate-scale-in border ${message.includes('ERRO')
                        ? 'bg-danger/10 border-danger/20 text-danger'
                        : 'bg-brand/10 border-brand/20 text-brand'
                        }`}>
                        {message}
                        {lastTrust === 'L3' && lastMethod === 'TRAJETO' && (
                            <p className="text-[10px] uppercase font-sans font-black tracking-tighter opacity-70 mt-1 text-white">
                                AUDITORIA VALIDADA PELO SISTEMA
                            </p>
                        )}
                    </div>
                )}

                <Divider label="MEIOS DE PROVA" />

                <div className="space-y-4">
                    <Card className="!p-4 bg-white/[0.02]">
                        <p className="text-[11px] text-muted font-bold leading-relaxed uppercase tracking-tight">
                            💡 <strong className="text-brand">Dica L3:</strong> Marque &quot;Entrei&quot; no embarque e &quot;Desci&quot; ao chegar no destino para ganhar Prova de Trajeto automaticamente.
                        </p>
                    </Card>

                    <Button
                        variant="secondary"
                        onClick={() => setIsScannerOpen(true)}
                        className="w-full h-14 !text-sm border-white/10"
                        icon={<QrCode size={18} />}
                    >
                        Prova de Ponto Parceiro (QR)
                    </Button>
                </div>
            </div>

            {isScannerOpen && (
                <QRScanner onClose={() => setIsScannerOpen(false)} />
            )}

            <RatingModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                lineId={MOCK_LINE_ID}
                deviceId={deviceId}
            />

            <HelpModal
                storageKey="help_registrar_v1"
                tips={[
                    "Marque 'Ônibus Passou' se o veículo chegou cheio ou você preferiu não embarcar.",
                    "Marque 'Entrei' ao embarcar. Se depois marcar 'Desci', o sistema gera Prova de Trajeto (L3).",
                    "L1 = Relato individual. L2 = Confirmado por outros no mesmo ponto. L3 = Prova física.",
                ]}
            />
        </AppShell>
    );
}
