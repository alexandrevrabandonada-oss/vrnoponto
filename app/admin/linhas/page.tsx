import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export default async function AdminLinhas() {
    const supabase = await createClient();

    // Buscar linhas existentes
    const { data: lines, error: linesError } = await supabase
        .from('lines')
        .select('*')
        .order('code');

    // Server Action para criar nova linha
    async function createLine(formData: FormData) {
        'use server';
        const code = formData.get('code') as string;
        const name = formData.get('name') as string;

        if (!code || !name) return;

        const supabaseAdmin = await createClient();
        await supabaseAdmin.from('lines').insert({ code, name });

        revalidatePath('/admin/linhas');
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Linhas</h1>
                <p className="text-gray-600">Gerencie as linhas de ônibus do sistema.</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h2 className="text-xl font-bold mb-4">Cadastrar Nova Linha</h2>
                <form action={createLine} className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Código (Ex: P200)</label>
                        <input type="text" name="code" required className="w-full p-2 border rounded-md" />
                    </div>
                    <div className="flex-[2]">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome (Ex: Vila Rica / Centro)</label>
                        <input type="text" name="name" required className="w-full p-2 border rounded-md" />
                    </div>
                    <button type="submit" className="bg-brand text-black px-6 py-2 rounded-md font-medium hover:bg-brand/90 transition">
                        Salvar
                    </button>
                </form>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {linesError && (
                    <div className="p-4 border-b border-red-200 bg-red-50 text-red-700 text-sm font-medium">
                        Falha ao carregar linhas: {linesError.message}
                    </div>
                )}
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="p-4 font-semibold text-gray-600">Código</th>
                            <th className="p-4 font-semibold text-gray-600">Nome</th>
                            <th className="p-4 font-semibold text-gray-600">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {lines?.map(line => (
                            <tr key={line.id}>
                                <td className="p-4 font-bold">{line.code}</td>
                                <td className="p-4">{line.name}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs ${line.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {line.is_active ? 'Ativo' : 'Inativo'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {(!lines || lines.length === 0) && (
                            <tr><td colSpan={3} className="p-8 text-center text-gray-500">Nenhuma linha cadastrada.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div >
    );
}
