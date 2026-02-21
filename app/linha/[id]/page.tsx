import { createClient } from '@/lib/supabase/server';

export default async function LinhaDetails({ params }: { params: { id: string } }) {
    const supabase = await createClient();
    const lineId = params.id;

    // Busca detalhes da linha
    const { data: line } = await supabase
        .from('lines')
        .select('*')
        .eq('id', lineId)
        .single();

    if (!line) {
        return <div className="p-8 text-center text-red-500 font-bold">Linha não encontrada.</div>;
    }

    // Busca variantes pra podermos linkar a tabela
    const { data: variants } = await supabase
        .from('line_variants')
        .select('id, name')
        .eq('line_id', lineId);

    const variantIds = variants?.map(v => v.id) || [];

    // Busca Tabelas de Horários (PDFs manuais e automáticos da PMVR)
    let schedules: { id: string, title: string, valid_from: string, pdf_path: string, doc_type?: string, meta?: Record<string, string> }[] = [];

    // Constrói a query usando Variante (Upload Manual) OU Line Code (Crawler PMVR)
    let orQuery = `line_code.eq.${line.code}`;
    if (variantIds.length > 0) {
        orQuery = `line_variant_id.in.(${variantIds.join(',')}),` + orQuery;
    }

    const { data: scheds } = await supabase
        .from('official_schedules')
        .select('id, title, valid_from, pdf_path, doc_type, meta')
        .or(orQuery)
        .order('id', { ascending: false });

    if (scheds) schedules = scheds;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    return (
        <main className="flex min-h-screen flex-col items-center p-8 bg-gray-50 dark:bg-gray-900">
            <div className="w-full max-w-3xl space-y-8">

                {/* Header */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">VIAÇÃO SUL FLUMINENSE</p>
                            <h1 className="text-3xl font-black text-gray-900 dark:text-white mt-1">
                                {line.code} - {line.name}
                            </h1>
                        </div>
                        <div className="text-right">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${line.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {line.is_active ? 'Em Operação' : 'Desativada'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Tabelas de Horários Officiais */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Horários Oficiais</h2>

                    {schedules.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                            Nenhuma tabela de horário oficial foi disponibilizada para esta linha ainda.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {schedules.map((sched) => {
                                const isHorario = !sched.doc_type || sched.doc_type === 'HORARIO';
                                const parsedDate = sched.valid_from ? new Date(sched.valid_from).toLocaleDateString('pt-BR') : sched.meta?.em_vigor;
                                const updateDate = sched.meta?.data_atualizacao;

                                return (
                                    <div key={sched.id} className="flex flex-col sm:flex-row justify-between items-center p-4 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600">
                                        <div className="mb-3 sm:mb-0">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${isHorario ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                                    {isHorario ? 'HORÁRIOS' : 'ITINERÁRIO'}
                                                </span>
                                                <p className="font-bold text-gray-800 dark:text-gray-100">{sched.title || 'Tabela Oficial'}</p>
                                            </div>

                                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-0.5">
                                                {parsedDate && <p>Válido a partir de: {parsedDate}</p>}
                                                {updateDate && <p>Atualizado em: {updateDate}</p>}
                                                {sched.meta?.operator && <p>Operadora: {sched.meta.operator}</p>}
                                            </div>
                                        </div>
                                        <a
                                            href={`${supabaseUrl}/storage/v1/object/public/official/${sched.pdf_path}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full sm:w-auto text-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                                        >
                                            Abrir PDF
                                        </a>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

            </div >
        </main >
    );
}
