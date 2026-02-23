import Link from 'next/link';
import { Button } from '@/components/ui';
import { Settings } from 'lucide-react';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-black flex flex-col">
            {/* Admin Navbar */}
            <nav className="bg-zinc-900 border-b border-white/5 text-white p-4 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin" className="font-industrial text-xl tracking-tight text-brand">
                            VR <span className="text-white">ADMIN</span>
                        </Link>
                        <div className="hidden md:flex items-center gap-6 ml-8 text-[10px] font-black uppercase tracking-widest text-muted">
                            <Link href="/admin/linhas" className="hover:text-brand transition-colors">Linhas</Link>
                            <Link href="/admin/pontos" className="hover:text-brand transition-colors">Pontos</Link>
                            <Link href="/admin/sugestoes" className="hover:text-brand transition-colors">Sugestões</Link>
                            <Link href="/admin/oficial" className="hover:text-brand transition-colors">Horários</Link>
                            <Link href="/admin/mutirao" className="hover:text-brand transition-colors">Mutirões</Link>
                            <Link href="/admin/parceiros" className="hover:text-brand transition-colors">Parceiros</Link>
                            <Link href="/admin/status" className="hover:text-brand transition-colors text-brand">Status</Link>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="ghost" className="!h-10 !w-10 !p-0">
                            <Settings size={18} />
                        </Button>
                    </div>
                </div>
            </nav>

            <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8">
                {children}
            </main>
        </div>
    );
}
