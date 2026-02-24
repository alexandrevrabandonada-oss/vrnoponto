'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { MapPin } from 'lucide-react';
import { Button } from './ui';

interface ExamplePreviewProps {
    children: React.ReactNode;
    title?: string;
}

export const ExamplePreview = ({ children }: ExamplePreviewProps) => {
    const router = useRouter();

    return (
        <div className="w-full space-y-6">
            <div className="relative group">
                <div className="absolute -top-2 left-4 z-10 bg-brand text-black text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-xl transform -rotate-1">
                    Exemplo (Ilustrativo)
                </div>
                <div className="pointer-events-none select-none filter blur-[0.5px] grayscale-[0.3]">
                    {children}
                </div>
            </div>

            <Button
                variant="primary"
                onClick={() => router.push('/no-ponto')}
                className="w-full !h-12 !text-[11px] font-black uppercase tracking-widest"
                icon={<MapPin size={14} />}
            >
                Gerar primeiros dados agora
            </Button>
        </div>
    );
};
