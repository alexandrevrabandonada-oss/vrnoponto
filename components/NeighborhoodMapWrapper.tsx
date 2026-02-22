"use client";

import dynamic from 'next/dynamic';
import { type NeighborhoodMapItem, type NeighborhoodGeoJSON } from '@/components/NeighborhoodMap';

const DynamicMap = dynamic(
    () => import('@/components/NeighborhoodMap'),
    {
        ssr: false,
        loading: () => <div className="h-full w-full flex items-center justify-center bg-gray-100 rounded-xl animate-pulse text-gray-500 font-medium">Carregando Mapa de Bairros...</div>
    }
);

export default function NeighborhoodMapWrapper({
    neighborhoods,
    geojsonData,
    mode = 'circles',
}: {
    neighborhoods: NeighborhoodMapItem[];
    geojsonData?: NeighborhoodGeoJSON;
    mode?: 'circles' | 'polygons';
}) {
    return <DynamicMap neighborhoods={neighborhoods} geojsonData={geojsonData} mode={mode} />;
}
