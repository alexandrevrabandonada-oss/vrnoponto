import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowRight, MapPin, Clock, ChevronRight } from 'lucide-react'

export default async function Home() {
  let isConnected = false;

  try {
    const supabase = await createClient();
    await supabase.from('_ping').select('id').limit(1);
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      isConnected = true;
    }
  } catch {
    isConnected = false;
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-5">
      <div className="w-full max-w-sm space-y-5">

        {/* Hero CTA Card */}
        <div className="bg-indigo-900 text-white rounded-[2.5rem] p-8 shadow-2xl shadow-indigo-300 dark:shadow-none relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-indigo-700 rounded-full opacity-30 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-violet-600 rounded-full opacity-20 blur-2xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 bg-white/10 border border-white/20 w-fit px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-5">
              <Clock size={11} className="text-indigo-300" />
              10 segundos
            </div>

            <h1 className="text-2xl font-black leading-tight">
              Tá no ponto?<br />Registra agora.
            </h1>
            <p className="text-indigo-200 text-sm mt-2 leading-relaxed opacity-80">
              Sua presença vira dado de auditoria. Anônimo. Gratuito.
            </p>

            <Link href="/no-ponto"
              className="mt-6 flex items-center justify-between w-full bg-white text-indigo-900 font-black py-4 px-5 rounded-2xl shadow-lg transition-all active:scale-95 hover:bg-indigo-50">
              <div className="flex items-center gap-2">
                <MapPin size={20} className="text-indigo-600" />
                Estou no Ponto
              </div>
              <ArrowRight size={20} className="text-indigo-500" />
            </Link>

            <Link href="/como-usar"
              className="mt-3 flex items-center justify-center gap-1 text-indigo-300 text-xs font-bold hover:text-white transition">
              Como funciona? <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/registrar"
            className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 text-center hover:shadow-md transition flex flex-col items-center gap-2">
            <span className="text-2xl">🚌</span>
            <span className="font-bold text-sm text-gray-700 dark:text-gray-200 leading-tight">Registrar Ação</span>
            <span className="text-[10px] text-gray-400">Boarding / Alighted</span>
          </Link>
          <Link href="/boletim"
            className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 text-center hover:shadow-md transition flex flex-col items-center gap-2">
            <span className="text-2xl">📊</span>
            <span className="font-bold text-sm text-gray-700 dark:text-gray-200 leading-tight">Boletim</span>
            <span className="text-[10px] text-gray-400">Auditoria semanal</span>
          </Link>
        </div>

        {/* Status badge */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
          {isConnected ? 'Sistema operacional' : 'Sem conexão com banco'}
        </div>
      </div>
    </main>
  );
}
