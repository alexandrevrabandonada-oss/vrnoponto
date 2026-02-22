import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { QRGenerator } from '@/components/admin/QRGenerator';
import { StopsImportCard } from '@/components/admin/StopsImportCard';

export default async function AdminPontos() {
    const supabase = await createClient();

    const { data: stops } = await supabase
        .from('stops')
        .select('id, code, name, is_active')
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

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Pontos de Ônibus</h1>
                <p className="text-gray-600">Gerencie as paradas físicas do sistema.</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h2 className="text-xl font-bold mb-4">Cadastrar Novo Ponto</h2>
                <form action={createStop} className="flex flex-wrap gap-4 items-end">
                    <div className="w-24">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cód. (Opc)</label>
                        <input type="text" name="code" className="w-full p-2 border rounded-md" placeholder="PT-001" />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome/Localização</label>
                        <input type="text" name="name" required className="w-full p-2 border rounded-md" placeholder="Rua 33, Vila Rica" />
                    </div>
                    <div className="w-32">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                        <input type="number" step="any" name="lat" required className="w-full p-2 border rounded-md" placeholder="-22.123" />
                    </div>
                    <div className="w-32">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                        <input type="number" step="any" name="lng" required className="w-full p-2 border rounded-md" placeholder="-44.123" />
                    </div>
                    <button type="submit" className="bg-brand text-black px-6 py-2 rounded-md font-bold hover:brightness-110 transition h-[42px]">
                        Salvar
                    </button>
                </form>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="p-4 font-semibold text-gray-600">Código</th>
                            <th className="p-4 font-semibold text-gray-600">Nome</th>
                            <th className="p-4 font-semibold text-gray-600">Status</th>
                            <th className="p-4 font-semibold text-gray-600">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {stops?.map(stop => (
                            <tr key={stop.id}>
                                <td className="p-4 text-gray-500">{stop.code || '-'}</td>
                                <td className="p-4 font-medium">{stop.name}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs ${stop.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {stop.is_active ? 'Ativo' : 'Inativo'}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <QRGenerator stopId={stop.id} stopName={stop.name} />
                                </td>
                            </tr>
                        ))}
                        {(!stops || stops.length === 0) && (
                            <tr><td colSpan={3} className="p-8 text-center text-gray-500">Nenhum ponto cadastrado.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <StopsImportCard />
        </div>
    );
}
