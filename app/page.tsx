'use client';

import * as React from 'react';
import Link from 'next/link';
import { MapPin, Clock, ChevronRight, Info, ShieldCheck } from 'lucide-react';
import { AppShell, Card, Badge, BrandSymbol, PrimaryCTA } from '@/components/ui';
import { PrivacyModal } from '@/components/PrivacyModal';
import { createClient } from '@/lib/supabase/client';
import { FavoritesSection } from '@/components/FavoritesSection';
import { QuickActions } from '@/components/QuickActions';
import { MutiraoBanner } from '@/components/MutiraoBanner';
import { AppTour } from '@/components/AppTour';
import { trackFunnel, FUNNEL_EVENTS } from '@/lib/telemetry';

export default function Home() {
  const [isPrivacyOpen, setIsPrivacyOpen] = React.useState(false);
  const [isHeroLoading, setIsHeroLoading] = React.useState(false);
  const [isHeroSuccess, setIsHeroSuccess] = React.useState(false);

  React.useEffect(() => {
    trackFunnel(FUNNEL_EVENTS.HOME_START);
    const checkConnection = async () => {
      try {
        const supabase = createClient();
        await supabase.from('_ping').select('id').limit(1);
      } catch {
        /* silent */
      }
    };
    checkConnection();
  }, []);

  const handleHeroClick = () => {
    setIsHeroLoading(true);
    // Simular um registro rápido/transição
    setTimeout(() => {
      setIsHeroLoading(false);
      setIsHeroSuccess(true);
      setTimeout(() => setIsHeroSuccess(false), 2000);
    }, 800);
  };

  return (
    <AppShell title="Início">
      <div className="min-h-[calc(100vh-12rem)] flex flex-col items-center justify-between p-2 sm:p-6 relative overflow-hidden bg-[#070707] rounded-[2rem] border border-white/5">
      {/* Background Texture & Glow */}
      <div className="absolute inset-0 industrial-texture opacity-30 pointer-events-none" />
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[150%] aspect-square bg-brand/5 rounded-full blur-[120px] pointer-events-none" />

      <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
      <AppTour />

      {/* Header */}
      <header className="w-full flex justify-center py-6 animate-fade-in opacity-80 z-20">
        <div className="flex items-center gap-2">
          <BrandSymbol className="w-5 h-5 text-brand" />
          <span className="font-industrial text-lg text-white tracking-[0.3em] uppercase">VR no ponto</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="w-full max-w-sm space-y-10 z-10 animate-fade-in-up">

        {/* Active Mutirao Banner */}
        <MutiraoBanner />

        {/* Hero Section */}
        <Card className={`text-center !p-10 !rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.5)] border-brand/10 transition-all duration-500 focus-within:ring-2 focus-within:ring-brand/50 ${isHeroSuccess ? 'scale-[1.02] border-brand/40 shadow-brand/10' : ''}`} variant="surface">
          <Badge variant="brand" className="mb-8 px-4 py-2 bg-brand/10 border-brand/20 !text-brand text-xs font-bold">
            <Clock size={14} className="mr-2" />
            Veredito em 10 segundos
          </Badge>

          <h1 id="tour-welcome" className="text-5xl font-industrial leading-[0.85] tracking-tighter text-white italic mb-12">
            TÁ NO PONTO?<br />
            <span className="text-brand uppercase selection:bg-brand selection:text-black">REGISTRE AGORA</span>
          </h1>

          <PrimaryCTA
            id="tour-gps-action"
            href="/no-ponto"
            onClick={handleHeroClick}
            loading={isHeroLoading}
            className={isHeroSuccess ? '!bg-emerald-500 !text-white' : ''}
            aria-label="Iniciar registro de presença no ponto"
          >
            {isHeroSuccess ? (
              <span className="animate-scale-in">RELATO ENVIADO!</span>
            ) : (
              <div className="flex items-center gap-4">
                <MapPin size={28} aria-hidden="true" />
                estou no ponto
              </div>
            )}
          </PrimaryCTA>

          {/* Secondary Shortcuts - Discretos, abaixo do CTA principal */}
          <div className="mt-8 flex items-center justify-center gap-6">
            <Link href="/bairros"
              className="min-h-[44px] flex items-center gap-1.5 text-white/50 text-[10px] font-black uppercase tracking-widest hover:text-brand focus-visible:text-brand outline-none transition px-2">
              <MapPin size={12} aria-hidden="true" /> Ver Bairros
            </Link>
            <div className="w-1.5 h-1.5 rounded-full bg-white/5" aria-hidden="true" />
            <Link href="/mapa/bairros"
              className="min-h-[44px] flex items-center gap-1.5 text-white/50 text-[10px] font-black uppercase tracking-widest hover:text-brand focus-visible:text-brand outline-none transition px-2">
              <ChevronRight size={14} aria-hidden="true" /> Ver Mapa
            </Link>
          </div>

          <div id="tour-recording" className="mt-8 pt-8 border-t border-white/5 space-y-1 font-sans">
            <p className="text-white/80 text-[10px] font-black uppercase tracking-widest italic flex items-center justify-center gap-2">
              <ShieldCheck size={12} className="text-brand" aria-hidden="true" />
              Anonimato Garantido — Sem Login
            </p>
          </div>
        </Card>


        {/* Favorites & Quick Actions (Simplified display) */}
        <div className="space-y-12 pb-10">
          <FavoritesSection />

          <div className="pt-4">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-[1px] flex-1 bg-white/5" />
              <span className="text-[9px] font-black text-muted-foreground tracking-[0.3em] uppercase">Mais Consultas</span>
              <div className="h-[1px] flex-1 bg-white/5" />
            </div>
            <QuickActions />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-sm py-10 flex flex-col items-center gap-6 z-20">
        <button
          onClick={() => setIsPrivacyOpen(true)}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-white transition-colors"
        >
          <Info size={12} />
          Privacidade e Dados
        </button>
      </footer>
      </div>
    </AppShell>
  );
}
