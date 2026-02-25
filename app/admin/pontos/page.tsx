import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { QRGenerator } from '@/components/admin/QRGenerator';
import { StopsImportCard } from '@/components/admin/StopsImportCard';
import { OsmImportCard } from '@/components/admin/OsmImportCard';
import Link from 'next/link';
import { MapPin, UploadCloud, Plus, AlertTriangle } from 'lucide-react';
import {
    PageHeader, SectionCard, Button
} from '@/components/ui';
import { AdminStopQuickAddCard } from '@/components/admin/AdminStopQuickAddCard';
import { AdminOperatorManager } from '@/components/admin/AdminOperatorManager';
import { AdminStopMergeCard } from '@/components/admin/AdminStopMergeCard';

export default async function AdminPontos({
    searchParams
}: {
    searchParams?: { [key: string]: string | string[] | undefined }
}) {
    const supabase = await createClient();

    const currentTab = typeof searchParams?.tab === 'string' ? searchParams.tab : 'pontos';

    const { data: stops } = await supabase
        .from('stops')
        .select('id, code, name, is_active, merged_into_id')
        .is('merged_into_id', null)
        .order('name');

    async function createStop(formData: FormData) {
        'use server';
        const code = formData.get('code') as string;
        const name = formData.get('name') as string;
        const lat = parseFloat(formData.get('lat') as string);
        const lng = parseFloat(formData.get('lng') as string);

        if (!name || isNaN(lat) || isNaN(lng)) return;

        const pointWKT = `POINT(${lng} ${lat})`;

        const supabaseAdmin = await createClient();
        await supabaseAdmin.from('stops').insert({
            code: code || null,
            name,
            location: pointWKT
        });

        revalidatePath('/admin/pontos');
    }

    const inputBase = "w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder:text-white/20 focus:outline-none focus:border-brand/50 transition-colors text-sm font-medium";
    const labelBase = "block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 ml-1";

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
                <div>
                    <PageHeader
                        title="Pontos de Ônibus"
                        subtitle="Gerencie as paradas físicas do sistema."
                        className="!pb-0"
                    />
                </div>
                <div className="bg-white/5 p-1 rounded-xl border border-white/10 flex">
                    <Link
                        href="/admin/pontos?tab=pontos"
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${currentTab === 'pontos' ? 'bg-brand text-black shadow-lg shadow-brand/20' : 'text-white/40 hover:text-white'}`}
                    >
                        <MapPin size={14} /> Meus Pontos
                    </Link>
                    <Link
                        href="/admin/pontos?tab=seed"
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${currentTab === 'seed' ? 'bg-brand text-black shadow-lg shadow-brand/20' : 'text-white/40 hover:text-white'}`}
                    >
                        <UploadCloud size={14} /> Seed VR (Importação)
                    </Link>
                </div>
            </div>

            {currentTab === 'pontos' ? (
                <div className="space-y-8">
                    <AdminOperatorManager />
                    <AdminStopMergeCard />
                    <AdminStopQuickAddCard />

                    <SectionCard title="Cadastrar Novo Ponto (Manual)" subtitle="Adicione uma parada preenchendo as coordenadas">
                        <form action={createStop} className="flex flex-col lg:flex-row gap-6 items-end">
                            <div className="w-full lg:w-32">
                                <label className={labelBase}>Cód. (Opc)</label>
                                <input type="text" name="code" className={inputBase} placeholder="PT-001" />
                            </div>
                            <div className="flex-1 w-full min-w-[200px]">
                                <label className={labelBase}>Nome/Localização</label>
                                <input type="text" name="name" required className={inputBase} placeholder="Rua 33, Vila Rica" />
                            </div>
                            <div className="grid grid-cols-2 gap-4 w-full lg:w-72">
                                <div>
                                    <label className={labelBase}>Latitude</label>
                                    <input type="number" step="any" name="lat" required className={inputBase} placeholder="-22.123" />
                                </div>
                                <div>
                                    <label className={labelBase}>Longitude</label>
                                    <input type="number" step="any" name="lng" required className={inputBase} placeholder="-44.123" />
                                </div>
                            </div>
                            <Button type="submit" className="w-full lg:w-auto !h-[50px] !px-8 uppercase font-black italic tracking-widest" icon={<Plus size={20} />}>
                                Salvar
                            </Button>
                        </form>
                    </SectionCard>

                    <SectionCard title="Lista de Pontos" subtitle={`${stops?.length || 0} locais registrados`}>
                        <div className="overflow-x-auto -mx-6">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Código</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Nome</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Status</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.02]">
                                    {stops?.map(stop => (
                                        <tr key={stop.id} className="group hover:bg-white/[0.02] transition-colors focus-within:bg-white/[0.04] outline-none">
                                            <td className="px-6 py-5 text-sm font-mono text-white/40">{stop.code || '—'}</td>
                                            <td className="px-6 py-5 font-bold text-white group-hover:text-brand transition-colors">{stop.name}</td>
                                            <td className="px-6 py-5">
                                                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${stop.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                                    {stop.is_active ? 'Ativo' : 'Inativo'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex justify-end">
                                                    <QRGenerator stopId={stop.id} stopName={stop.name} />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {(!stops || stops.length === 0) && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-16 text-center text-white/20 font-black uppercase tracking-widest italic leading-loose">
                                                Nenhum ponto cadastrado ainda.<br />
                                                <span className="text-[10px] opacity-50 not-italic">Dica: Use &apos;Seed VR&apos; para importar ou &apos;Cadastro Rápido&apos; acima.</span>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </SectionCard>
                </div>
            ) : (
                <div className="space-y-8">
                    <div className="bg-brand/5 border border-brand/20 p-6 rounded-3xl flex items-start gap-4">
                        <AlertTriangle className="text-brand shrink-0 animate-pulse" size={24} />
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-white mb-2">Atenção: Seed Inicial de Paradas</h3>
                            <p className="text-xs text-white/60 leading-relaxed max-w-2xl">
                                Esta seção permite importar milhares de paradas do OpenStreetMap ou de um arquivo CSV local. O sistema possui deduplicação automática baseada numa distância de raio de 15 metros. Re-importar paradas sobrepostas irá apenas atualizar nomes ou pular, em vez de duplicar.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                        <SectionCard title="📦 Via OpenStreetMap" subtitle="Importação direta por Overpass API">
                            <OsmImportCard />
                        </SectionCard>
                        <SectionCard title="📂 Via Arquivo Local" subtitle="Processamento de CSV ou JSON">
                            <StopsImportCard />
                        </SectionCard>
                    </div>
                </div>
            )}
        </div>
    );
}
