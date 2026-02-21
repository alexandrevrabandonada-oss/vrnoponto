import Link from 'next/link';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Admin Navbar */}
            <nav className="bg-indigo-900 text-white p-4 shadow-md">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Link href="/admin" className="font-bold text-xl tracking-tight">
                        VR no Ponto <span className="text-indigo-300">Admin</span>
                    </Link>
                    <div className="space-x-4 text-sm font-medium">
                        <Link href="/admin/linhas" className="hover:text-indigo-200 transition-colors">Linhas</Link>
                        <Link href="/admin/pontos" className="hover:text-indigo-200 transition-colors">Pontos</Link>
                        <Link href="/admin/oficial" className="hover:text-indigo-200 transition-colors">Horários Oficiais</Link>
                        <Link href="/admin/parceiros" className="hover:text-indigo-200 transition-colors">Parceiros</Link>
                    </div>
                </div>
            </nav>

            <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8">
                {children}
            </main>
        </div>
    );
}
