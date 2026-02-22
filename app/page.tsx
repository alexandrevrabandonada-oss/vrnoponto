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
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative">
      <div className="w-full max-w-sm space-y-8 animate-fade-in-up">

        {/* Branding */}
        <div className="flex justify-center mb-2">
          <div className="flex items-center gap-3 bg-surface border border-white/5 px-5 py-2.5 rounded-xl shadow-2xl">
            <div className="w-9 h-9 grad-brand rounded flex items-center justify-center text-black font-black text-xl italic shadow-lg">VR</div>
            <span className="font-industrial text-xl text-white tracking-widest pt-1">no ponto</span>
          </div>
        </div>

        {/* Hero CTA Card */}
        <div className="grad-brand text-black rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/20 rounded-full blur-3xl -mr-20 -mt-20 group-hover:scale-125 transition-transform duration-1000" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 bg-black/10 border border-black/10 w-fit px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-6">
              <Clock size={12} className="text-black/60" />
              Impacto Industrial
            </div>

            <h1 className="text-4xl font-industrial leading-[0.9] tracking-tighter">
              Tá no ponto?<br />Registra agora.
            </h1>
            <p className="text-black/80 text-sm mt-4 leading-relaxed font-bold max-w-[260px]">
              Sua auditoria técnica ajuda a fiscalizar o transporte público.
            </p>

            <Link href="/no-ponto"
              className="mt-8 flex items-center justify-between w-full bg-black text-brand font-black py-5 px-6 rounded-xl shadow-2xl transition-all active:scale-95 hover:bg-neutral-900 group/btn focus-ring">
              <div className="flex items-center gap-3 text-lg uppercase tracking-tight">
                <MapPin size={24} className="group-hover/btn:scale-110 transition-transform" />
                Estou no Ponto
              </div>
              <ArrowRight size={24} className="group-hover/btn:translate-x-1 transition-transform" />
            </Link>

            <Link href="/como-usar"
              className="mt-5 flex items-center justify-center gap-2 text-black/60 text-[10px] font-black uppercase tracking-widest hover:text-black transition">
              Protocolo de Auditoria <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        {/* Quick actions grid */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/registrar"
            className="surface-card rounded-2xl p-6 text-center hover:border-brand/40 transition-all duration-300 flex flex-col items-center gap-4 group focus-ring">
            <div className="w-14 h-14 bg-surface-2 border border-white/5 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
              <Bus className="text-brand" size={28} />
            </div>
            <div className="space-y-1">
              <span className="block font-industrial text-base text-white tracking-widest">Registrar</span>
              <span className="block text-[10px] text-muted font-bold uppercase tracking-tighter font-sans">Fluxo Técnico</span>
            </div>
          </Link>

          <Link href="/boletim"
            className="surface-card rounded-2xl p-6 text-center hover:border-brand/40 transition-all duration-300 flex flex-col items-center gap-4 group focus-ring">
            <div className="w-14 h-14 bg-surface-2 border border-white/5 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
              <BarChart3 className="text-brand" size={28} />
            </div>
            <div className="space-y-1">
              <span className="block font-industrial text-base text-white tracking-widest">Boletim</span>
              <span className="block text-[10px] text-muted font-bold uppercase tracking-tighter font-sans">Métricas / GAP</span>
            </div>
          </Link>
        </div>

        {/* Status indicator */}
        <div className="flex justify-center pt-4">
          <StatusIndicator isConnected={isConnected} />
        </div>
      </div>
    </main>
  );
}
