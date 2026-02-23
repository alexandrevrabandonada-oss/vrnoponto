import { AlertTriangle, MapPin, Search } from 'lucide-react';
import { Card, Button } from '@/components/ui';

interface EmptyStateAuditProps {
    title?: string;
    description?: string;
    samplesMissing?: number;
}

export function EmptyStateAudit({
    title = 'Sem Dados Suficientes',
    description = 'Não há participações comunitárias suficientes para fechar um diagnóstico confiável nesta área.',
    samplesMissing
}: EmptyStateAuditProps) {
    return (
        <Card className="!p-8 bg-zinc-900 border-white/5 border-dashed text-center flex flex-col items-center justify-center min-h-[250px] space-y-6">
            <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center text-brand mb-2">
                <AlertTriangle size={32} />
            </div>

            <div className="space-y-2 max-w-sm mx-auto">
                <h3 className="font-industrial text-xl text-white tracking-widest uppercase">{title}</h3>
                <p className="text-sm font-medium text-muted">{description}</p>
                {samplesMissing && samplesMissing > 0 && (
                    <div className="inline-block mt-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-white uppercase tracking-wider">
                        Faltam {samplesMissing} Amostras
                    </div>
                )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 w-full justify-center max-w-sm mx-auto">
                <Button variant="primary" href="/no-ponto" className="w-full sm:w-auto">
                    <MapPin size={16} className="mr-2" /> Auditar Ponto
                </Button>
                <Button variant="secondary" href="/como-usar" className="w-full sm:w-auto">
                    <Search size={16} className="mr-2" /> Entender o Método
                </Button>
            </div>
        </Card>
    );
}
