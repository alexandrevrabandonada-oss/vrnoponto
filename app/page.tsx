'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, MapPin, Clock, ChevronRight, Info, ShieldCheck } from 'lucide-react';
import { Button, Card, Badge, StatusPill, BrandSymbol } from '@/components/ui';
import { PrivacyModal } from '@/components/PrivacyModal';
import { createClient } from '@/lib/supabase/client';
import { FavoritesSection } from '@/components/FavoritesSection';
import { QuickActions } from '@/components/QuickActions';

export default function Home() {
  const [isConnected, setIsConnected] = React.useState(true);
  const [isPrivacyOpen, setIsPrivacyOpen] = React.useState(false);
  const [isHeroLoading, setIsHeroLoading] = React.useState(false);
  const [isHeroSuccess, setIsHeroSuccess] = React.useState(false);

  React.useEffect(() => {
    const checkConnection = async () => {
      try {
        const supabase = createClient();
        const { error } = await supabase.from('_ping').select('id').limit(1);
        setIsConnected(!error);
      } catch {
        setIsConnected(false);
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
    <main className="min-h-screen flex flex-col items-center justify-between p-6 relative overflow-hidden bg-[#070707]">
      {/* Background Texture & Glow */}
      <div className="absolute inset-0 industrial-texture opacity-30 pointer-events-none" />
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[150%] aspect-square bg-brand/5 rounded-full blur-[120px] pointer-events-none" />

      <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />

      {/* Header */}
      <header className="w-full flex justify-center py-6 animate-fade-in opacity-80 z-20">
        <div className="flex items-center gap-2">
          <BrandSymbol className="w-5 h-5 text-brand" />
          <span className="font-industrial text-lg text-white tracking-[0.3em] uppercase">VR no ponto</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="w-full max-w-sm space-y-10 z-10 animate-fade-in-up">

        {/* Hero Section */}
        <Card className={`text-center !p-10 !rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.5)] border-brand/10 transition-all duration-500 ${isHeroSuccess ? 'scale-[1.02] border-brand/40 shadow-brand/10' : ''}`} variant="surface">
          <Badge variant="brand" className="mb-8 px-4 py-2 bg-brand/10 border-brand/20 !text-brand text-xs">
            <Clock size={14} className="mr-2" />
            Auditoria em 10 segundos
          </Badge>

          <h1 className="text-5xl font-industrial leading-[0.85] tracking-tighter text-white">
            TÁ NO PONTO?<br />
            <span className="text-brand">REGISTRA AGORA.</span>
          </h1>

          <div className="mt-8 space-y-1 font-sans">
            <p className="text-white text-sm font-black uppercase tracking-widest italic flex items-center justify-center gap-2">
              <ShieldCheck size={14} className="text-brand" />
              Anônimo. Sem login. Gratuito.
            </p>
            <p className="text-muted text-[10px] font-bold uppercase tracking-tight">
              Seu registro vira dado de auditoria oficial.
            </p>
          </div>

          <Link href="/no-ponto" passHref legacyBehavior>
            <Button
              className={`mt-12 w-full h-18 !text-2xl hover:scale-[1.02] active:scale-[0.98] shadow-brand/20 transition-all ${isHeroSuccess ? '!bg-emerald-500 !text-white' : ''}`}
              icon={isHeroSuccess ? null : <ArrowRight size={28} />}
              iconPosition="right"
              loading={isHeroLoading}
              onClick={handleHeroClick}
            >
              <div className="flex items-center gap-4">
                {isHeroSuccess ? (
                  <span className="animate-scale-in">REGISTRADO!</span>
                ) : (
                  <>
                    <MapPin size={28} />
                    estou no ponto
                  </>
                )}
              </div>
            </Button>
          </Link>

          <Link href="/como-usar"
            className="mt-8 flex items-center justify-center gap-2 text-muted-foreground text-[10px] font-black uppercase tracking-widest hover:text-brand transition">
            Entenda como a auditoria funciona <ChevronRight size={14} />
          </Link>
        </Card>

        {/* Favorites */}
        <FavoritesSection />

        {/* Quick Actions */}
        <QuickActions />
      </div>

      {/* Footer */}
      <footer className="w-full max-w-sm py-10 flex flex-col items-center gap-6 z-20">
        <StatusPill
          status={isConnected ? 'online' : 'offline'}
          label={isConnected ? 'CONECTADO — REGISTRANDO' : 'MODO OFFLINE — SALVANDO LOCAL'}
        />
        <button
          onClick={() => setIsPrivacyOpen(true)}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-white transition-colors"
        >
          <Info size={12} />
          Privacidade e Dados
        </button>
      </footer>
    </main>
  );
}
