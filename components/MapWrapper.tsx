"use client";

import dynamic from 'next/dynamic';
import { type StopMapItem } from '@/components/DelayMap';

const DynamicMap = dynamic(
    () => import('@/components/DelayMap'),
    {
        ssr: false,
        loading: () => <div className="h-full w-full flex items-center justify-center bg-gray-100 rounded-xl animate-pulse text-gray-500 font-medium">Carregando Mapa...</div>
    }
);

export default function MapWrapper({ stops }: { stops: StopMapItem[] }) {
    return <DynamicMap stops={stops} />;
}
