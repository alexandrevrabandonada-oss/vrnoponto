'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui';

interface TourStep {
    targetId: string;
    title: string;
    description: string;
    position: 'top' | 'bottom' | 'center';
}

const TOUR_STEPS: TourStep[] = [
    {
        targetId: 'tour-welcome',
        title: 'Bem-vindo ao VR no Ponto!',
        description: 'Aqui você audita o transporte público da cidade com poucos toques.',
        position: 'bottom'
    },
    {
        targetId: 'tour-gps-action',
        title: 'Passo 1: Estou no Ponto',
        description: 'Toque aqui quando estiver no ponto. O GPS identifica sua parada automaticamente.',
        position: 'bottom'
    },
    {
        targetId: 'tour-recording',
        title: 'Passo 2: Registro Rápido',
        description: 'No próximo passo, basta um toque no ônibus que passou. Pronto!',
        position: 'top'
    }
];

export function AppTour() {
    const [isVisible, setIsVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, height: 0 });

    const finishTour = useCallback(() => {
        localStorage.setItem('vrnp_tour_completed', 'true');
        setIsVisible(false);
    }, []);

    const updateCoords = useCallback(() => {
        const step = TOUR_STEPS[currentStep];
        const el = document.getElementById(step.targetId);
        if (el) {
            const rect = el.getBoundingClientRect();
            setCoords({
                top: rect.top + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width,
                height: rect.height,
            });
        } else if (step.position === 'center') {
            // Fallback for center if element not found (though welcome is better on title)
            setCoords({
                top: window.innerHeight / 2,
                left: window.innerWidth / 2,
                width: 0,
                height: 0,
            });
        }
    }, [currentStep]);

    useEffect(() => {
        const completed = localStorage.getItem('vrnp_tour_completed');
        if (!completed) {
            // Pequeno delay para a página carregar
            const timer = setTimeout(() => {
                setIsVisible(true);
                updateCoords();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [updateCoords]);

    useEffect(() => {
        if (isVisible) {
            // Use requestAnimationFrame to avoid synchronous setState warning
            requestAnimationFrame(() => {
                updateCoords();
            });
            window.addEventListener('resize', updateCoords);
            const handleEsc = (e: KeyboardEvent) => {
                if (e.key === 'Escape') finishTour();
            };
            window.addEventListener('keydown', handleEsc);
            return () => {
                window.removeEventListener('resize', updateCoords);
                window.removeEventListener('keydown', handleEsc);
            };
        }
    }, [isVisible, updateCoords, finishTour]);

    const handleNext = () => {
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            finishTour();
        }
    };

    if (!isVisible) return null;

    const step = TOUR_STEPS[currentStep];

    return (
        <div className="fixed inset-0 z-[200] pointer-events-none">
            {/* Dark Overlay */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 pointer-events-auto"
                onClick={finishTour}
            />

            {/* Highlight Box */}
            <motion.div
                animate={{
                    top: coords.top - 8,
                    left: coords.left - 8,
                    width: coords.width + 16,
                    height: coords.height + 16,
                }}
                className="absolute border-2 border-brand rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] pointer-events-none z-10"
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            />

            {/* Tooltip Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{
                        opacity: 1,
                        y: 0,
                        top: step.position === 'bottom' ? coords.top + coords.height + 24 : coords.top - 180,
                        left: '50%',
                        translateX: '-50%'
                    }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute w-[calc(100vw-48px)] max-w-sm pointer-events-auto z-20"
                >
                    <div className="bg-brand text-black p-6 rounded-[2rem] shadow-2xl relative">
                        {/* Triangle decorator */}
                        <div className={`absolute left-1/2 -translate-x-1/2 w-4 h-4 bg-brand rotate-45 ${step.position === 'bottom' ? '-top-2' : '-bottom-2'
                            }`} />

                        <div className="space-y-3">
                            <h3 className="font-industrial italic uppercase text-lg leading-tight tracking-tight">
                                {step.title}
                            </h3>
                            <p className="text-xs font-bold uppercase tracking-tight leading-relaxed opacity-80">
                                {step.description}
                            </p>
                        </div>

                        <div className="mt-8 flex items-center justify-between">
                            <button
                                onClick={finishTour}
                                className="text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity p-2 min-h-[44px]"
                            >
                                Pular Tour
                            </button>

                            <Button
                                onClick={handleNext}
                                className="!bg-black !text-white !h-11 !px-6 !rounded-xl !text-[11px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2"
                            >
                                {currentStep === TOUR_STEPS.length - 1 ? (
                                    <>Entendi <Check size={14} /></>
                                ) : (
                                    <>Próximo <ChevronRight size={14} /></>
                                )}
                            </Button>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
