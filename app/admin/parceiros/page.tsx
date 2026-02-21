import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { QRGenerator } from '@/components/admin/QRGenerator';

export default async function AdminParceiros() {
    const supabase = await createClient();

    const { data: partners } = await supabase
        .from('partners')
        .select('id, name, category, neighborhood, is_active')
        .order('name');

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

        const supabaseAdmin = await createClient();
        const { error } = await supabaseAdmin.from('partners').insert({
            name,
            category,
            address,
            neighborhood,
            location: pointWKT
        });

        if (error) {
            console.error('Erro ao criar parceiro:', error);
            return;
        }

        revalidatePath('/admin/parceiros');
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Pontos Parceiros</h1>
                <p className="text-gray-600">Gestão de locais autorizados (Pontos de Apoio, Comércio, etc).</p>
            </div>

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
                        <button type="submit" className="w-full bg-indigo-600 text-white px-6 py-2 rounded-md font-medium hover:bg-indigo-700 transition h-[42px]">
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
                            <th className="p-4 font-semibold text-gray-600">QR Code</th>
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
                                <td className="p-4 text-right">
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
        </div>
    );
}
