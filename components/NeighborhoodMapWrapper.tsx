"use client";

import dynamic from 'next/dynamic';
import { type NeighborhoodMapItem } from '@/components/NeighborhoodMap';

const DynamicMap = dynamic(
    () => import('@/components/NeighborhoodMap'),
    {
        ssr: false,
        loading: () => <div className="h-full w-full flex items-center justify-center bg-gray-100 rounded-xl animate-pulse text-gray-500 font-medium">Carregando Mapa de Bairros...</div>
    }
);

export default function NeighborhoodMapWrapper({ neighborhoods }: { neighborhoods: NeighborhoodMapItem[] }) {
    return <DynamicMap neighborhoods={neighborhoods} />;
}
