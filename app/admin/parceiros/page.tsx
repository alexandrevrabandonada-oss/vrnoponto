import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { QRGenerator } from '@/components/admin/QRGenerator';
import { PartnerKitModal } from '@/components/admin/PartnerKitModal';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { CheckCircle, XCircle, UserPlus, FileDown, PieChart } from 'lucide-react';
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
                    <h1 className="text-3xl font-bold text-gray-900">Pontos Parceiros</h1>
                    <p className="text-gray-600">Gestão de locais autorizados e pedidos de adesão.</p>
                </div>
            </div>

            {/* Funnel Metrics Dashboard */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <div className="bg-gray-100 text-gray-600 p-2 rounded-xl">
                            <PieChart size={20} />
                        </div>
                        <h2 className="text-lg font-black text-gray-900">Funil de Ativação (30 dias)</h2>
                    </div>
                    <a href="/api/admin/funnel/csv" target="_blank"
                        className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 px-4 py-2 rounded-xl transition">
                        <FileDown size={16} /> Exportar CSV diário
                    </a>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                        <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Acessaram Form</div>
                        <div className="text-2xl font-black text-gray-900">{funnel.total_views_apply || 0}</div>
                    </div>
                    <div className="border-l border-gray-100 pl-6">
                        <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Enviaram PENDENTE</div>
                        <div className="flex items-end gap-2">
                            <span className="text-2xl font-black text-brand">{funnel.total_requests_created || 0}</span>
                            <span className="text-xs font-bold bg-brand/10 text-brand px-2 py-0.5 rounded-full mb-1">{funnel.apply_rate_pct}% conversão</span>
                        </div>
                    </div>
                    <div className="border-l border-gray-100 pl-6">
                        <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Aprovados ATIVO</div>
                        <div className="flex items-end gap-2">
                            <span className="text-2xl font-black text-green-600">{funnel.total_requests_approved || 0}</span>
                            <span className="text-xs font-bold bg-green-50 text-green-600 px-2 py-0.5 rounded-full mb-1">{funnel.approval_rate_pct}% tx. aprovação</span>
                        </div>
                    </div>
                    <div className="border-l border-gray-100 pl-6">
                        <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Kits Gerados (QR)</div>
                        <div className="flex items-end gap-2">
                            <span className="text-2xl font-black text-gray-900">{funnel.total_kits_generated || 0}</span>
                            <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full mb-1">{funnel.kit_rate_pct}% tx. geração</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* A/B Invite Metrics */}
            <InviteABDashboard adminToken={process.env.ADMIN_TOKEN} />

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                <a href="/admin/parceiros"
                    className={`px-5 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'partners' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    Parceiros Ativos ({partners?.length || 0})
                </a>
                <a href="/admin/parceiros?tab=requests"
                    className={`px-5 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 ${activeTab === 'requests' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    Pedidos
                    {pendingCount > 0 && (
                        <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                            {pendingCount}
                        </span>
                    )}
                </a>
            </div>

            {/* ---- TAB: PARTNERS ---- */}
            {activeTab === 'partners' && (
                <>
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h2 className="text-xl font-bold mb-4">Cadastrar Novo Parceiro</h2>
                        <form action={createPartner} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Estabelecimento</label>
                                <input type="text" name="name" required className="w-full p-2 border rounded-md" placeholder="Padaria da Vila" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                                <select name="category" className="w-full p-2 border rounded-md">
                                    <option value="comercio">Comércio</option>
                                    <option value="sindicato">Sindicato / Associação</option>
                                    <option value="escola">Escola / Público</option>
                                    <option value="outro">Outro</option>
                                </select>
                            </div>
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Endereço (Opcional)</label>
                                <input type="text" name="address" className="w-full p-2 border rounded-md" placeholder="Rua 33, nº 10" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
                                <input type="text" name="neighborhood" className="w-full p-2 border rounded-md" placeholder="Vila Rica" />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Lat</label>
                                    <input type="number" step="any" name="lat" required className="w-full p-2 border rounded-md" placeholder="-22.51" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Lng</label>
                                    <input type="number" step="any" name="lng" required className="w-full p-2 border rounded-md" placeholder="-44.10" />
                                </div>
                            </div>
                            <div className="flex items-end">
                                <button type="submit" className="w-full bg-brand text-black px-6 py-2 rounded-md font-medium hover:bg-brand/90 transition h-[42px]">
                                    Cadastrar Parceiro
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="p-4 font-semibold text-gray-600">Local</th>
                                    <th className="p-4 font-semibold text-gray-600">Categoria</th>
                                    <th className="p-4 font-semibold text-gray-600">Bairro</th>
                                    <th className="p-4 font-semibold text-gray-600">Status</th>
                                    <th className="p-4 font-semibold text-gray-600 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {partners?.map(partner => (
                                    <tr key={partner.id}>
                                        <td className="p-4 font-medium">{partner.name}</td>
                                        <td className="p-4 text-gray-500 capitalize">{partner.category}</td>
                                        <td className="p-4 text-gray-500">{partner.neighborhood || '-'}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs ${partner.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {partner.is_active ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>
                                        <td className="p-4 flex items-center justify-end gap-2">
                                            <PartnerKitModal partner={partner} />
                                            <QRGenerator partnerId={partner.id} stopName={partner.name} />
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
                        <div className="bg-white p-12 rounded-xl border border-gray-200 text-center text-gray-500">
                            Nenhum pedido recebido ainda.
                        </div>
                    )}
                    {(requests as PartnerRequest[])?.map(req => (
                        <div key={req.id} className={`bg-white p-5 rounded-2xl border shadow-sm ${req.status === 'PENDING' ? 'border-amber-200' : req.status === 'APPROVED' ? 'border-green-200' : 'border-gray-200'}`}>
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${req.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : req.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                            {req.status === 'PENDING' ? '⏳ PENDENTE' : req.status === 'APPROVED' ? '✅ APROVADO' : '❌ REJEITADO'}
                                        </span>
                                        <span className="text-xs text-gray-400">{new Date(req.created_at).toLocaleString('pt-BR')}</span>
                                    </div>
                                    <h3 className="text-lg font-black text-gray-900">{req.name}</h3>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs text-gray-600">
                                        {req.neighborhood && <span>📍 {req.neighborhood}</span>}
                                        {req.category && <span>🏷️ {req.category}</span>}
                                        {req.contact_name && <span>👤 {req.contact_name}</span>}
                                        {req.contact_phone && <a href={`https://wa.me/55${req.contact_phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-green-600 hover:underline font-medium">📱 {req.contact_phone}</a>}
                                        {req.contact_instagram && <a href={`https://instagram.com/${req.contact_instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="text-pink-600 hover:underline font-medium">📸 {req.contact_instagram}</a>}
                                        {req.address && <span className="col-span-2">🏠 {req.address}</span>}
                                    </div>
                                    {req.message && (
                                        <p className="mt-2 text-sm text-gray-500 italic border-l-2 border-gray-200 pl-3">&ldquo;{req.message}&rdquo;</p>
                                    )}
                                </div>

                                {req.status === 'PENDING' && (
                                    <div className="flex flex-col gap-2 min-w-[160px]">
                                        <form action={approveRequest}>
                                            <input type="hidden" name="id" value={req.id} />
                                            <button type="submit"
                                                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition">
                                                <UserPlus size={16} /> Aprovar e Criar
                                            </button>
                                        </form>
                                        <details className="group">
                                            <summary className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-700 text-sm font-bold px-4 py-2 rounded-xl cursor-pointer transition list-none">
                                                <XCircle size={16} /> Rejeitar
                                            </summary>
                                            <form action={rejectRequest} className="mt-2 space-y-2">
                                                <input type="hidden" name="id" value={req.id} />
                                                <textarea name="reason" rows={2} placeholder="Motivo (opcional)"
                                                    className="w-full text-xs p-2 border border-gray-200 rounded-lg resize-none" />
                                                <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition">
                                                    Confirmar Rejeição
                                                </button>
                                            </form>
                                        </details>
                                    </div>
                                )}

                                {req.status === 'APPROVED' && (
                                    <div className="flex items-center gap-1 text-green-600 text-sm font-bold">
                                        <CheckCircle size={18} /> Aprovado
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
