'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';

export function MovementSeal() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="fixed bottom-4 right-4 z-[100] group max-sm:bottom-3 max-sm:right-3"
        >
            <div className="relative flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 pr-3 sm:pr-4 bg-black/40 backdrop-blur-md border border-white/10 rounded-xl sm:rounded-2xl shadow-2xl transition-all hover:bg-black/60 hover:border-brand/30 group-hover:scale-105 active:scale-95">
                <div className="relative w-8 h-8 sm:w-10 sm:h-10 overflow-hidden rounded-lg sm:rounded-xl border border-white/10 group-hover:border-brand/50 transition-colors">
                    <Image
                        src="/movimento-vr-abandonada.jpg"
                        alt="Logo VR Abandonada"
                        fill
                        className="object-cover"
                    />
                </div>
                <div className="flex flex-col">
                    <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-white/40 group-hover:text-brand/60 transition-colors leading-none mb-0.5">
                        Faz parte do
                    </span>
                    <span className="text-[9px] sm:text-[10px] font-industrial italic uppercase text-white/90 group-hover:text-white transition-colors leading-none">
                        Movimento <span className="text-brand">VR Abandonada</span>
                    </span>
                </div>

                {/* Glow Effect */}
                <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-brand/5 opacity-0 group-hover:opacity-100 transition-opacity blur-xl -z-10" />
            </div>
        </motion.div>
    );
}
