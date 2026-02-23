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
                <h1 className="font-industrial text-4xl uppercase tracking-tight text-white">Linhas</h1>
                <p className="text-xs font-bold text-white/50 uppercase tracking-wider mt-1">
                    Gerencie as linhas de ônibus do sistema.
                </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 shadow-[0_12px_32px_rgba(0,0,0,0.35)]">
                <h2 className="font-industrial text-xl uppercase tracking-wide text-white mb-5">Cadastrar Nova Linha</h2>
                <form action={createLine} className="grid grid-cols-1 lg:grid-cols-[1fr_2fr_auto] gap-4 items-end">
                    <div>
                        <label className="block text-[11px] font-black text-white/70 mb-2 uppercase tracking-wider">
                            Código (Ex: P200)
                        </label>
                        <input
                            type="text"
                            name="code"
                            required
                            className="w-full h-12 px-4 rounded-xl border border-white/15 bg-black/30 text-white placeholder:text-white/35 outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-black text-white/70 mb-2 uppercase tracking-wider">
                            Nome (Ex: Vila Rica / Centro)
                        </label>
                        <input
                            type="text"
                            name="name"
                            required
                            className="w-full h-12 px-4 rounded-xl border border-white/15 bg-black/30 text-white placeholder:text-white/35 outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
                        />
                    </div>
                    <button
                        type="submit"
                        className="h-12 px-7 rounded-xl bg-brand text-black text-sm font-black uppercase tracking-wide hover:brightness-110 transition"
                    >
                        Salvar
                    </button>
                </form>
            </div>

            <div className="rounded-2xl border border-white/10 bg-zinc-900/60 overflow-hidden shadow-[0_12px_32px_rgba(0,0,0,0.35)]">
                {linesError && (
                    <div className="p-4 border-b border-red-500/30 bg-red-500/10 text-red-300 text-sm font-semibold">
                        Falha ao carregar linhas: {linesError.message}
                    </div>
                )}
                <table className="w-full text-left text-sm">
                    <thead className="bg-white/[0.03] border-b border-white/10">
                        <tr>
                            <th className="p-4 text-[11px] font-black uppercase tracking-wider text-white/70">Código</th>
                            <th className="p-4 text-[11px] font-black uppercase tracking-wider text-white/70">Nome</th>
                            <th className="p-4 text-[11px] font-black uppercase tracking-wider text-white/70">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {lines?.map(line => (
                            <tr key={line.id} className="hover:bg-white/[0.02] transition-colors">
                                <td className="p-4 font-black text-brand">{line.code}</td>
                                <td className="p-4 text-white/85">{line.name}</td>
                                <td className="p-4">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wide border ${line.is_active
                                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                        : 'bg-red-500/15 text-red-300 border-red-500/30'
                                        }`}>
                                        {line.is_active ? 'Ativo' : 'Inativo'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {(!lines || lines.length === 0) && (
                            <tr>
                                <td colSpan={3} className="p-10 text-center text-sm font-semibold text-white/45">
                                    Nenhuma linha cadastrada.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div >
    );
}
