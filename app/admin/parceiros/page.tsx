import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { QRGenerator } from '@/components/admin/QRGenerator';
import { PartnerKitModal } from '@/components/admin/PartnerKitModal';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { CheckCircle, XCircle, UserPlus, FileDown, PieChart, MapPin, Users } from 'lucide-react';
import { InviteABDashboard } from '@/components/admin/InviteABDashboard';

interface PartnerRequest {
    id: string;
    name: string;
    contact_name: string | null;
    contact_phone: string | null;
    contact_instagram: string | null;
    neighborhood: string | null;
    category: string | null;
    address: string | null;
    lat: number | null;
    lng: number | null;
    message: string | null;
    status: string;
    created_at: string;
}

export default async function AdminParceiros({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
    const params = await searchParams;
    const activeTab = params.tab === 'requests' ? 'requests' : 'partners';

    const supabase = await createClient();

    const { data: partners } = await supabase
        .from('partners')
        .select('id, name, category, neighborhood, is_active')
        .order('name');

    const supabaseAdmin = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
    const { data: requests } = await supabaseAdmin
        .from('partner_requests')
        .select('*')
        .order('created_at', { ascending: false });

    // Fetch funnel 30d summary view
    const { data: funnelData } = await supabaseAdmin
        .from('vw_partner_funnel_summary_30d')
        .select('*')
        .single();

    // Fallback if view is empty or missing yet
    const funnel = funnelData || {
        total_views_apply: 0,
        total_requests_created: 0,
        total_requests_approved: 0,
        total_kits_generated: 0,
        apply_rate_pct: 0,
        approval_rate_pct: 0,
        kit_rate_pct: 0
    };

    const pendingCount = requests?.filter(r => r.status === 'PENDING').length || 0;

    // Server actions

    async function createPartner(formData: FormData) {
        'use server';
        const name = formData.get('name') as string;
        const category = formData.get('category') as string;
        const address = formData.get('address') as string;
        const neighborhood = formData.get('neighborhood') as string;
        const lat = parseFloat(formData.get('lat') as string);
        const lng = parseFloat(formData.get('lng') as string);

        if (!name || isNaN(lat) || isNaN(lng)) return;

        const pointWKT = `POINT(${lng} ${lat})`;

        const supabaseAdmin2 = await createClient();
        await supabaseAdmin2.from('partners').insert({ name, category, address, neighborhood, location: pointWKT });

        revalidatePath('/admin/parceiros');
    }

    async function approveRequest(formData: FormData) {
        'use server';
        const id = formData.get('id') as string;

        const adminClient = createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        );

        const { data: req } = await adminClient.from('partner_requests').select('*').eq('id', id).single();
        if (!req) return;

        // Create WKT point only if lat/lng available
        const location = req.lat && req.lng ? `POINT(${req.lng} ${req.lat})` : 'POINT(-44.1 -22.5)';

        await adminClient.from('partners').insert({
            name: req.name,
            category: req.category || 'comercio',
            address: req.address,
            neighborhood: req.neighborhood,
            location,
            is_active: true
        });

        await adminClient.from('partner_requests').update({
            status: 'APPROVED',
            resolved_at: new Date().toISOString()
        }).eq('id', id);

        try {
            const today = new Date().toISOString().slice(0, 10);
            await adminClient.rpc('increment_telemetry', { p_event_key: 'partner_request_approved', p_date: today });
        } catch { }

        revalidatePath('/admin/parceiros');
    }

    async function rejectRequest(formData: FormData) {
        'use server';
        const id = formData.get('id') as string;
        const reason = formData.get('reason') as string;

        const adminClient = createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        );

        await adminClient.from('partner_requests').update({
            status: 'REJECTED',
            rejection_reason: reason || null,
            resolved_at: new Date().toISOString()
        }).eq('id', id);

        try {
            const today = new Date().toISOString().slice(0, 10);
            await adminClient.rpc('increment_telemetry', { p_event_key: 'partner_request_rejected', p_date: today });
        } catch { }

        revalidatePath('/admin/parceiros');
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-industrial italic text-white">Pontos Parceiros</h1>
                    <p className="text-white/40 font-black uppercase tracking-widest text-[10px]">Gestão de locais autorizados e pedidos de adesão.</p>
                </div>
            </div>

            {/* Funnel Metrics Dashboard */}
            <div className="bg-[#0c0f14] rounded-2xl border border-white/10 shadow-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <div className="bg-brand/10 text-brand p-2 rounded-xl">
                            <PieChart size={20} />
                        </div>
                        <h2 className="text-lg font-black text-white italic uppercase tracking-tight">Funil de Ativação (30 dias)</h2>
                    </div>
                    <a href="/api/admin/funnel/csv" target="_blank"
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition">
                        <FileDown size={16} /> Exportar CSV diário
                    </a>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                        <div className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Acessaram Form</div>
                        <div className="text-2xl font-black text-white italic">{funnel.total_views_apply || 0}</div>
                    </div>
                    <div className="border-l border-white/5 pl-6">
                        <div className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Enviaram PENDENTE</div>
                        <div className="flex items-end gap-2">
                            <span className="text-2xl font-black text-brand italic">{funnel.total_requests_created || 0}</span>
                            <span className="text-[9px] font-black bg-brand/10 text-brand px-2 py-0.5 rounded-full mb-1 tracking-tight">{funnel.apply_rate_pct}% conversão</span>
                        </div>
                    </div>
                    <div className="border-l border-white/5 pl-6">
                        <div className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Aprovados ATIVO</div>
                        <div className="flex items-end gap-2">
                            <span className="text-2xl font-black text-green-500 italic">{funnel.total_requests_approved || 0}</span>
                            <span className="text-[9px] font-black bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full mb-1 tracking-tight">{funnel.approval_rate_pct}% tx. aprovação</span>
                        </div>
                    </div>
                    <div className="border-l border-white/5 pl-6">
                        <div className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Kits Gerados (QR)</div>
                        <div className="flex items-end gap-2">
                            <span className="text-2xl font-black text-white italic">{funnel.total_kits_generated || 0}</span>
                            <span className="text-[9px] font-black bg-white/5 text-white/40 px-2 py-0.5 rounded-full mb-1 tracking-tight">{funnel.kit_rate_pct}% tx. geração</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* A/B Invite Metrics */}
            <InviteABDashboard adminToken={process.env.ADMIN_TOKEN} />

            {/* Tabs */}
            <div className="flex gap-1 bg-white/5 p-1 rounded-xl w-fit border border-white/10">
                <a href="/admin/parceiros"
                    className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition ${activeTab === 'partners' ? 'bg-brand text-black shadow-lg' : 'text-white/40 hover:text-white'}`}>
                    Parceiros Ativos ({partners?.length || 0})
                </a>
                <a href="/admin/parceiros?tab=requests"
                    className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition flex items-center gap-2 ${activeTab === 'requests' ? 'bg-brand text-black shadow-lg' : 'text-white/40 hover:text-white'}`}>
                    Pedidos
                    {pendingCount > 0 && (
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${activeTab === 'requests' ? 'bg-black text-brand' : 'bg-amber-500 text-white'}`}>
                            {pendingCount}
                        </span>
                    )}
                </a>
            </div>

            {/* ---- TAB: PARTNERS ---- */}
            {activeTab === 'partners' && (
                <>
                    <div className="bg-[#0c0f14] p-6 rounded-2xl border border-white/10 shadow-2xl">
                        <h2 className="text-xl font-industrial italic text-white mb-4">Cadastrar Novo Parceiro</h2>
                        <form action={createPartner} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">Nome do Estabelecimento</label>
                                <input type="text" name="name" required className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl text-white font-bold placeholder:text-white/10 focus:outline-none focus:border-brand/40 transition-all" placeholder="Padaria da Vila" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">Categoria</label>
                                <select name="category" className="w-full h-12 px-4 bg-[#0c0f14] border border-white/10 rounded-xl text-white font-bold focus:outline-none focus:border-brand/40 transition-all appearance-none cursor-pointer">
                                    <option value="comercio">Comércio</option>
                                    <option value="sindicato">Sindicato / Associação</option>
                                    <option value="escola">Escola / Público</option>
                                    <option value="outro">Outro</option>
                                </select>
                            </div>
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">Endereço (Opcional)</label>
                                <input type="text" name="address" className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl text-white font-bold placeholder:text-white/10 focus:outline-none focus:border-brand/40 transition-all" placeholder="Rua 33, nº 10" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">Bairro</label>
                                <input type="text" name="neighborhood" className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl text-white font-bold placeholder:text-white/10 focus:outline-none focus:border-brand/40 transition-all" placeholder="Vila Rica" />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">Lat</label>
                                    <input type="number" step="any" name="lat" required className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl text-white font-bold placeholder:text-white/10 focus:outline-none focus:border-brand/40 transition-all" placeholder="-22.51" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">Lng</label>
                                    <input type="number" step="any" name="lng" required className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl text-white font-bold placeholder:text-white/10 focus:outline-none focus:border-brand/40 transition-all" placeholder="-44.10" />
                                </div>
                            </div>
                            <div className="flex items-end">
                                <button type="submit" className="w-full h-12 bg-brand text-black rounded-xl font-black uppercase tracking-widest text-xs hover:bg-brand/90 transition shadow-lg shadow-brand/20">
                                    Cadastrar Parceiro
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="bg-[#0c0f14] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white/5 border-b border-white/10">
                                <tr>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-white/40">Local</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-white/40">Categoria</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-white/40">Bairro</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-white/40">Status</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-white/40 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {partners?.map(partner => (
                                    <tr key={partner.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="p-4 font-bold text-white uppercase tracking-tight italic">{partner.name}</td>
                                        <td className="p-4 text-white/40 capitalize font-medium">{partner.category}</td>
                                        <td className="p-4 text-white/40 font-medium">{partner.neighborhood || '-'}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${partner.is_active ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                {partner.is_active ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>
                                        <td className="p-4 flex items-center justify-end gap-2">
                                            <PartnerKitModal partner={partner} />
                                            <QRGenerator stopId={partner.id} stopName={partner.name} />
                                        </td>
                                    </tr>
                                ))}
                                {(!partners || partners.length === 0) && (
                                    <tr><td colSpan={5} className="p-8 text-center text-gray-500">Nenhum parceiro cadastrado.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* ---- TAB: REQUESTS ---- */}
            {activeTab === 'requests' && (
                <div className="space-y-4">
                    {requests?.length === 0 && (
                        <div className="bg-[#0c0f14] p-12 rounded-2xl border border-white/10 text-center text-white/20 italic font-black uppercase tracking-widest text-sm shadow-2xl">
                            Nenhum pedido recebido ainda.
                        </div>
                    )}
                    {(requests as PartnerRequest[])?.map(req => (
                        <div key={req.id} className={`bg-[#0c0f14] p-5 rounded-2xl border shadow-2xl transition-all ${req.status === 'PENDING' ? 'border-amber-500/30' : req.status === 'APPROVED' ? 'border-green-500/20' : 'border-white/5'}`}>
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${req.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500' : req.status === 'APPROVED' ? 'bg-green-500/10 text-green-500' : 'bg-white/5 text-white/40'}`}>
                                            {req.status === 'PENDING' ? '⏳ PENDENTE' : req.status === 'APPROVED' ? '✅ APROVADO' : '❌ REJEITADO'}
                                        </span>
                                        <span className="text-[10px] text-white/20 font-mono">{new Date(req.created_at).toLocaleString('pt-BR')}</span>
                                    </div>
                                    <h3 className="text-lg font-black text-white italic uppercase tracking-tight leading-tight">{req.name}</h3>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 text-[11px] text-white/40 font-bold uppercase tracking-wide">
                                        {req.neighborhood && <span className="flex items-center gap-1.5"><MapPin size={12} className="text-brand" /> {req.neighborhood}</span>}
                                        {req.category && <span>🏷️ {req.category}</span>}
                                        {req.contact_name && <span className="flex items-center gap-1.5"><Users size={12} /> {req.contact_name}</span>}
                                        {req.contact_phone && <a href={`https://wa.me/55${req.contact_phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-brand hover:underline">📱 {req.contact_phone}</a>}
                                        {req.contact_instagram && <a href={`https://instagram.com/${req.contact_instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="text-pink-500 hover:underline">📸 {req.contact_instagram}</a>}
                                        {req.address && <span className="col-span-2 opacity-60">🏠 {req.address}</span>}
                                    </div>
                                    {req.message && (
                                        <p className="mt-3 text-xs text-white/30 italic border-l-2 border-white/5 pl-3">&ldquo;{req.message}&rdquo;</p>
                                    )}
                                </div>

                                {req.status === 'PENDING' && (
                                    <div className="flex flex-col gap-2 min-w-[170px]">
                                        <form action={approveRequest}>
                                            <input type="hidden" name="id" value={req.id} />
                                            <button type="submit"
                                                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl transition shadow-lg shadow-green-900/20">
                                                <UserPlus size={14} /> Aprovar e Criar
                                            </button>
                                        </form>
                                        <details className="group">
                                            <summary className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-red-500/10 text-white/40 hover:text-red-500 text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl cursor-pointer transition list-none border border-white/10">
                                                <XCircle size={14} /> Rejeitar
                                            </summary>
                                            <form action={rejectRequest} className="mt-2 space-y-2 p-1">
                                                <input type="hidden" name="id" value={req.id} />
                                                <textarea name="reason" rows={2} placeholder="Motivo (opcional)"
                                                    className="w-full text-xs p-2.5 bg-black/40 border border-white/10 rounded-lg text-white placeholder:text-white/10 resize-none focus:outline-none focus:border-red-500/40" />
                                                <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest py-2 rounded-lg transition">
                                                    Confirmar Rejeição
                                                </button>
                                            </form>
                                        </details>
                                    </div>
                                )}

                                {req.status === 'APPROVED' && (
                                    <div className="flex items-center gap-1.5 text-green-500 text-[10px] font-black uppercase tracking-widest bg-green-500/10 px-3 py-1.5 rounded-full">
                                        <CheckCircle size={14} /> Aprovado
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
