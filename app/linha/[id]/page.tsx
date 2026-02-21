import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

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

    // Busca Tabelas de Horários (PDFs)
    let schedules: { id: string, title: string, valid_from: string, pdf_path: string }[] = [];
    if (variantIds.length > 0) {
        const { data: scheds } = await supabase
            .from('official_schedules')
            .select('id, title, valid_from, pdf_path')
            .in('line_variant_id', variantIds)
            .order('valid_from', { ascending: false });

        if (scheds) schedules = scheds;
    }

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
                            {schedules.map((sched) => (
                                <div key={sched.id} className="flex flex-col sm:flex-row justify-between items-center p-4 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600">
                                    <div className="mb-3 sm:mb-0">
                                        <p className="font-bold text-gray-800 dark:text-gray-100">{sched.title || 'Tabela de Horários'}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Válido a partir de: {new Date(sched.valid_from).toLocaleDateString('pt-BR')}
                                        </p>
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
                            ))}
                        </div>
                    )}
                </div>

            </div >
        </main >
    );
}
