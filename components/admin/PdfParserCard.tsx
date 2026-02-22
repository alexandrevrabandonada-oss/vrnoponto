import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RefreshCw, FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, Button, Divider, InlineAlert } from '@/components/ui';

type ScheduleDocs = {
    id: string;
    line_code: string;
    valid_from: string;
    pdf_path: string | null;
    runs: { status: string, parsed_at: string, meta: { errors?: string[], timesFound?: number, daySectionsFound?: number } }[] | null;
};

export function PdfParserCard() {
    const [schedules, setSchedules] = useState<ScheduleDocs[]>([]);
    const [loading, setLoading] = useState(true);
    const [parsingId, setParsingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadSchedules();
    }, []);

    async function loadSchedules() {
        setLoading(true);
        const supabase = createClient();

        const { data } = await supabase
            .from('official_schedules')
            .select(`
                id, line_code, valid_from, pdf_path,
                runs:official_schedule_parse_runs(status, parsed_at, meta)
            `)
            .eq('doc_type', 'HORARIO')
            .order('created_at', { ascending: false });

        if (data) setSchedules(data);
        setLoading(false);
    }

    async function handleParse(scheduleId: string) {
        setParsingId(scheduleId);
        setError(null);
        try {
            const adminToken = localStorage.getItem('admin_token') || prompt('Digite o token de ADMIN:');
            if (adminToken) localStorage.setItem('admin_token', adminToken);

            const res = await fetch(`/api/admin/oficial/parse?t=${adminToken}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ schedule_id: scheduleId })
            });

            if (!res.ok) throw new Error(await res.text());

            loadSchedules();
        } catch (err: unknown) {
            setError('Erro no parse: ' + (err instanceof Error ? err.message : String(err)));
        } finally {
            setParsingId(null);
        }
    }

    if (loading) return <div className="text-[10px] font-black uppercase text-muted/30 p-8 animate-pulse">Sincronizando registros...</div>;

    return (
        <Card className="border-white/5 bg-zinc-900/30">
            <h2 className="font-industrial text-xl uppercase tracking-tighter text-white mb-2 flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand" />
                Histórico de Extração
            </h2>
            <p className="text-[10px] text-muted font-bold uppercase tracking-widest mb-8 opacity-60">
                Auditoria de processamento de PDFs oficiais.
            </p>

            {error && (
                <InlineAlert variant="error" className="mb-6" title="Falha ao extrair PDF">
                    {error}
                </InlineAlert>
            )}

            <div className="space-y-4">
                {schedules.map(doc => {
                    const run = doc.runs && doc.runs.length > 0 ? doc.runs.sort((a, b) => new Date(b.parsed_at).getTime() - new Date(a.parsed_at).getTime())[0] : null;
                    const meta = run ? run.meta : null;

                    return (
                        <div key={doc.id} className="border border-white/5 rounded-2xl p-5 bg-white/[0.02] flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center hover:bg-white/[0.04] transition-colors">
                            <div className="flex-1 space-y-3">
                                <div className="flex items-center gap-3">
                                    <h3 className="font-industrial text-sm text-white uppercase tracking-widest">Linha {doc.line_code}</h3>
                                    {doc.pdf_path && <span className="text-[9px] font-black bg-brand/10 text-brand px-2 py-0.5 rounded-full uppercase">PDF Ativo</span>}
                                </div>
                                <div className="flex flex-wrap items-center gap-4 text-[10px] font-medium text-muted uppercase tracking-tight">
                                    <span className="flex items-center gap-1"><FileText size={12} /> Vigência: {doc.valid_from}</span>
                                    {run ? (
                                        <div className="flex items-center gap-3">
                                            {run.status === 'OK' && <span className="flex items-center text-emerald-400 gap-1"><CheckCircle className="w-3 h-3" /> Processado</span>}
                                            {run.status === 'WARN' && <span className="flex items-center text-amber-500 gap-1"><AlertTriangle className="w-3 h-3" /> Avisos</span>}
                                            {run.status === 'FAIL' && <span className="flex items-center text-danger gap-1"><AlertTriangle className="w-3 h-3" /> Falhou</span>}
                                            <span className="opacity-40">
                                                {meta?.timesFound} Horários | {meta?.daySectionsFound} Seções
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="italic opacity-30">Pendente de processamento</span>
                                    )}
                                </div>
                                {meta?.errors && meta.errors.length > 0 && (
                                    <div className="text-[9px] font-bold text-danger bg-danger/5 p-3 rounded-lg border border-danger/10 space-y-1">
                                        {meta.errors.map((e: string, idx: number) => <div key={idx} className="flex gap-2"><div className="mt-1 w-1 h-1 rounded-full bg-danger shrink-0" /> {e}</div>)}
                                    </div>
                                )}
                            </div>
                            <Button
                                onClick={() => handleParse(doc.id)}
                                loading={parsingId === doc.id}
                                disabled={!doc.pdf_path}
                                variant={run ? "ghost" : "primary"}
                                className="!h-12 !px-6 !text-[11px]"
                            >
                                <RefreshCw className={`w-4 h-4 mr-2 ${parsingId === doc.id ? 'animate-spin' : ''}`} />
                                {run ? 'Recalcular' : 'Extrair Dados'}
                            </Button>
                        </div>
                    );
                })}
                {schedules.length === 0 && (
                    <div className="text-center py-12 border border-dashed border-white/5 rounded-3xl">
                        <p className="text-[11px] font-black uppercase text-muted tracking-widest opacity-30">Nenhum documento encontrado.</p>
                    </div>
                )}
            </div>
        </Card>
    );
}
