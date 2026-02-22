import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowRight, MapPin, Clock, ChevronRight, BarChart3, Bus } from 'lucide-react'
import { Button, Card, Badge, StatusPill, IconButton } from '@/components/ui'

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
          <Card className="flex items-center gap-3 !px-5 !py-2.5" hasTexture={false}>
            <div className="w-9 h-9 grad-brand rounded flex items-center justify-center text-black font-black text-xl italic shadow-lg">VR</div>
            <span className="font-industrial text-xl text-white tracking-widest pt-1">no ponto</span>
          </Card>
        </div>

        {/* Hero CTA Card */}
        <div className="grad-brand text-black rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/20 rounded-full blur-3xl -mr-20 -mt-20 group-hover:scale-125 transition-transform duration-1000" />

          <div className="relative z-10">
            <Badge variant="muted" className="bg-black/10 border-black/10 !text-black/60 mb-6 px-3 py-1.5">
              <Clock size={12} className="mr-2" />
              Impacto Industrial
            </Badge>

            <h1 className="text-4xl font-industrial leading-[0.9] tracking-tighter">
              Tá no ponto?<br />Registra agora.
            </h1>
            <p className="text-black/80 text-sm mt-4 leading-relaxed font-bold max-w-[260px]">
              Sua auditoria técnica ajuda a fiscalizar o transporte público.
            </p>

            <Button href="/no-ponto" className="mt-8 w-full !bg-black !text-brand !shadow-2xl hover:!bg-neutral-900" icon={<ArrowRight size={24} />} iconPosition="right">
              <div className="flex items-center gap-3 text-lg uppercase tracking-tight">
                <MapPin size={24} />
                Estou no Ponto
              </div>
            </Button>

            <Link href="/como-usar"
              className="mt-5 flex items-center justify-center gap-2 text-black/60 text-[10px] font-black uppercase tracking-widest hover:text-black transition">
              Protocolo de Auditoria <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        {/* Quick actions grid */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/registrar" className="focus-ring rounded-2xl">
            <Card variant="surface" className="text-center hover:border-brand/40 group flex flex-col items-center gap-4 transition-all">
              <IconButton icon={<Bus size={28} className="text-brand" />} variant="surface" className="pointer-events-none group-hover:scale-110" />
              <div className="space-y-1">
                <span className="block font-industrial text-base text-white tracking-widest">Registrar</span>
                <Badge variant="muted">Fluxo Técnico</Badge>
              </div>
            </Card>
          </Link>

          <Link href="/boletim" className="focus-ring rounded-2xl">
            <Card variant="surface" className="text-center hover:border-brand/40 group flex flex-col items-center gap-4 transition-all">
              <IconButton icon={<BarChart3 size={28} className="text-brand" />} variant="surface" className="pointer-events-none group-hover:scale-110" />
              <div className="space-y-1">
                <span className="block font-industrial text-base text-white tracking-widest">Boletim</span>
                <Badge variant="muted">Métricas / GAP</Badge>
              </div>
            </Card>
          </Link>
        </div>

        {/* Status indicator */}
        <div className="flex justify-center pt-4">
          <StatusPill status={isConnected ? 'online' : 'error'} label={isConnected ? 'SISTEMA OPERACIONAL' : 'VRP EM MANUTENÇÃO'} />
        </div>
      </div>
    </main>
  );
}
