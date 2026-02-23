import Link from 'next/link';
import { AlertCircle, ArrowRight } from 'lucide-react';

export function EnvBanner() {
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasAnon = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const hasService = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (hasUrl && hasAnon) return null;

    const compatibilityMode = hasUrl && !hasAnon && hasService;

    return (
        <div className="bg-amber-500 text-amber-950 px-4 py-2 text-sm font-bold flex flex-wrap items-center justify-between gap-3 shadow-md z-[9999] relative">
            <div className="flex items-center gap-2">
                <AlertCircle size={18} className="shrink-0" />
                <span>
                    {compatibilityMode
                        ? 'Ambiente em modo de compatibilidade: chave pública do Supabase ausente. Recursos de leitura direta no navegador podem falhar.'
                        : 'Ambiente sem conexão com o banco de dados (Preview). As funcionalidades estão indisponíveis.'}
                </span>
            </div>
            <div className="flex items-center gap-3">
                <Link
                    href="/como-usar"
                    className="flex items-center gap-1 hover:text-white transition-colors underline decoration-amber-950/30 underline-offset-2"
                >
                    Como Configurar <ArrowRight size={14} />
                </Link>
                <div className="w-px h-4 bg-amber-950/20"></div>
                <Link
                    href="/admin/status"
                    className="flex items-center gap-1 hover:text-white transition-colors underline decoration-amber-950/30 underline-offset-2"
                >
                    Diagnóstico Admin <ArrowRight size={14} />
                </Link>
            </div>
        </div>
    );
}
