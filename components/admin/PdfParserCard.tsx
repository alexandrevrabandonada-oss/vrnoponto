import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RefreshCw, FileText, AlertTriangle, CheckCircle } from 'lucide-react';

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

    useEffect(() => {
        loadSchedules();
    }, []);

    async function loadSchedules() {
        setLoading(true);
        const supabase = createClient();

        // Fetch HORÁRIOS along with their latest parse run
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
        try {
            const adminToken = localStorage.getItem('admin_token') || prompt('Digite o token de ADMIN:');
            if (adminToken) localStorage.setItem('admin_token', adminToken);

            const res = await fetch(`/api/admin/oficial/parse?t=${adminToken}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ schedule_id: scheduleId })
            });

            if (!res.ok) throw new Error(await res.text());

            alert('Parse concluído!');
            loadSchedules();
        } catch (err: unknown) {
            alert('Erro no parse: ' + (err instanceof Error ? err.message : String(err)));
        } finally {
            setParsingId(null);
        }
    }

    if (loading) return <div className="text-sm p-4 text-gray-500">Carregando documentos...</div>;

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm max-w-4xl">
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Extrator de Horários (Prometido)
            </h2>
            <p className="text-sm text-gray-600 mb-6">
                Extraia a quantidade de viagens por hora dos PDFs oficiais para cruzar com a realidade.
            </p>

            <div className="space-y-4">
                {schedules.map(doc => {
                    // Sorting to get newest
                    const run = doc.runs && doc.runs.length > 0 ? doc.runs.sort((a, b) => new Date(b.parsed_at).getTime() - new Date(a.parsed_at).getTime())[0] : null;
                    const meta = run ? run.meta : null;

                    return (
                        <div key={doc.id} className="border border-gray-100 rounded-lg p-4 bg-gray-50 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                            <div>
                                <h3 className="font-bold text-gray-900">Linha {doc.line_code}</h3>
                                <div className="text-xs text-gray-500 space-x-3 mt-1">
                                    <span>Válido a partir: {doc.valid_from}</span>
                                    {doc.pdf_path && <span className="text-blue-600">PDF Disponível</span>}
                                </div>
                                <div className="mt-2 text-sm flexitems-center gap-2">
                                    {run ? (
                                        <div className="flex items-center gap-2">
                                            {run.status === 'OK' && <span className="flex items-center text-green-700 bg-green-100 px-2 py-0.5 rounded text-xs font-medium"><CheckCircle className="w-3 h-3 mr-1" /> OK</span>}
                                            {run.status === 'WARN' && <span className="flex items-center text-amber-700 bg-amber-100 px-2 py-0.5 rounded text-xs font-medium"><AlertTriangle className="w-3 h-3 mr-1" /> WARN</span>}
                                            {run.status === 'FAIL' && <span className="flex items-center text-red-700 bg-red-100 px-2 py-0.5 rounded text-xs font-medium"><AlertTriangle className="w-3 h-3 mr-1" /> FAIL</span>}
                                            <span className="text-gray-500 text-xs text-nowrap">
                                                {meta?.timesFound} horários | {meta?.daySectionsFound} seções
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-gray-400 text-xs italic">Ainda não parseado.</span>
                                    )}
                                </div>
                                {meta?.errors && meta.errors.length > 0 && (
                                    <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100 divide-y divide-red-200">
                                        {meta.errors.map((e: string, idx: number) => <div key={idx} className="py-1">{e}</div>)}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => handleParse(doc.id)}
                                disabled={parsingId === doc.id || !doc.pdf_path}
                                className="shrink-0 flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 font-medium px-4 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 transition"
                            >
                                {parsingId === doc.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                {run ? 'Repassar' : 'Criar Vínculo'}
                            </button>
                        </div>
                    );
                })}
                {schedules.length === 0 && <p className="text-sm text-gray-500">Nenhum documento do tipo HORARIO encontrado.</p>}
            </div>
        </div>
    );
}
