export default function AdminHome() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Administrativo</h1>
            <p className="text-gray-600">Bem-vindo ao painel de controle do VR no Ponto.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <a href="/admin/linhas" className="block p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <h2 className="text-xl font-bold text-indigo-700 mb-2">Linhas e Variantes</h2>
                    <p className="text-sm text-gray-500">Cadastre o trajeto das linhas (ex: P200 Vila Rica).</p>
                </a>
                <a href="/admin/pontos" className="block p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <h2 className="text-xl font-bold text-indigo-700 mb-2">Pontos de Ônibus</h2>
                    <p className="text-sm text-gray-500">Cadastre pontos fixos com coordenadas de GPS.</p>
                </a>
                <a href="/admin/oficial" className="block p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <h2 className="text-xl font-bold text-indigo-700 mb-2">Horários Oficiais</h2>
                    <p className="text-sm text-gray-500">Faça upload de tabelas de horário em PDF.</p>
                </a>
            </div>
        </div>
    );
}
