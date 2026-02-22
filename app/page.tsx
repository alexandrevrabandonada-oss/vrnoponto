import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowRight, MapPin, Clock, ChevronRight, BarChart3, Bus } from 'lucide-react'
import { StatusIndicator } from '@/components/StatusIndicator'

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
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full -z-10 bg-gray-50 dark:bg-gray-950" />
      <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-brand-500/10 rounded-full blur-[120px] animate-float" />
      <div className="absolute -bottom-[10%] -right-[10%] w-[30%] h-[30%] bg-violet-500/10 rounded-full blur-[100px] animate-float" style={{ animationDelay: '1.5s' }} />

      <div className="w-full max-w-sm space-y-6 animate-fade-in-up">

        {/* Branding */}
        <div className="flex justify-center mb-2">
          <div className="flex items-center gap-2 bg-white dark:bg-gray-900 px-4 py-2 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="w-8 h-8 grad-brand rounded-lg flex items-center justify-center text-white font-black text-lg italic">VR</div>
            <span className="font-black text-gray-900 dark:text-white tracking-tighter">no ponto</span>
          </div>
        </div>

        {/* Hero CTA Card */}
        <div className="grad-brand text-white rounded-[2.5rem] p-8 shadow-2xl shadow-brand-500/30 dark:shadow-none relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:scale-110 transition-transform duration-700" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 w-fit px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-6">
              <Clock size={12} className="text-brand-200" />
              Impacto imediato
            </div>

            <h1 className="text-3xl font-black leading-tight tracking-tight">
              Tá no ponto?<br />Registra agora.
            </h1>
            <p className="text-brand-100 text-sm mt-3 leading-relaxed opacity-90 max-w-[240px]">
              Sua espera vira dado de auditoria para toda a cidade.
            </p>

            <Link href="/no-ponto"
              className="mt-8 flex items-center justify-between w-full bg-white text-brand-700 font-black py-4.5 px-6 rounded-2xl shadow-xl transition-all active:scale-95 hover:bg-brand-50 group/btn">
              <div className="flex items-center gap-3">
                <MapPin size={22} className="text-brand-500 group-hover/btn:scale-110 transition-transform" />
                Estou no Ponto
              </div>
              <ArrowRight size={22} className="text-brand-400 group-hover/btn:translate-x-1 transition-transform" />
            </Link>

            <Link href="/como-usar"
              className="mt-4 flex items-center justify-center gap-1 text-brand-200 text-xs font-bold hover:text-white transition">
              Entenda como a auditoria funciona <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        {/* Quick actions grid */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/registrar"
            className="glass rounded-[2rem] p-5 shadow-sm text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center gap-3 group">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Bus className="text-indigo-600 dark:text-indigo-400" size={24} />
            </div>
            <div className="space-y-1">
              <span className="block font-black text-sm text-gray-900 dark:text-white">Registrar</span>
              <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Movimentação</span>
            </div>
          </Link>

          <Link href="/boletim"
            className="glass rounded-[2rem] p-5 shadow-sm text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center gap-3 group">
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <BarChart3 className="text-emerald-600 dark:text-emerald-400" size={24} />
            </div>
            <div className="space-y-1">
              <span className="block font-black text-sm text-gray-900 dark:text-white">Boletim</span>
              <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Linhas & Gaps</span>
            </div>
          </Link>
        </div>

        {/* Status indicator */}
        <div className="flex justify-center pt-2">
          <StatusIndicator isConnected={isConnected} />
        </div>
      </div>
    </main>
  );
}
