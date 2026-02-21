"use client";

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import MarkerClusterGroup_ from 'react-leaflet-cluster';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MarkerClusterGroup = MarkerClusterGroup_ as any;
import 'leaflet/dist/leaflet.css';
import { ArrowRight, Clock, MapPin, Users } from 'lucide-react';

// Corrigir path de ícones padrão do Marker no Leaflet c/ NextJS
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
    iconRetinaUrl,
    iconUrl,
    shadowUrl,
});

// Criar ícones coloridos baseado no delay (p50)
const createColoredIcon = (colorHex: string) => {
    return L.divIcon({
        className: 'custom-div-icon',
        html: `<div style='background-color:${colorHex}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);'></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
};

const iconGray = createColoredIcon('#9ca3af'); // Sem dados
const iconGreen = createColoredIcon('#10b981'); // 0-5 min
const iconYellow = createColoredIcon('#f59e0b'); // 5-10 min
const iconOrange = createColoredIcon('#f97316'); // 10-20 min
const iconRed = createColoredIcon('#ef4444'); // > 20 min

function getIconForP50(p50: number | null) {
    if (p50 === null) return iconGray;
    if (p50 <= 5) return iconGreen;
    if (p50 <= 10) return iconYellow;
    if (p50 <= 20) return iconOrange;
    return iconRed;
}

function getColorBlockForP50(p50: number | null) {
    if (p50 === null) return 'bg-gray-400';
    if (p50 <= 5) return 'bg-emerald-500';
    if (p50 <= 10) return 'bg-amber-500';
    if (p50 <= 20) return 'bg-orange-500';
    return 'bg-red-500';
}

export type StopMapItem = {
    id: string;
    name: string;
    location: {
        lat: number;
        lng: number;
    } | null;
    metrics: {
        p50_wait_min: number;
        p90_wait_min: number;
        samples: number;
    } | null;
};

export default function DelayMapComponent({ stops }: { stops: StopMapItem[] }) {
    // Volta Redonda center (approx)
    const defaultCenter: [number, number] = [-22.518, -44.095];
    const defaultZoom = 13;

    return (
        <MapContainer
            center={defaultCenter}
            zoom={defaultZoom}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%', zIndex: 0 }}
            className="rounded-xl"
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MarkerClusterGroup
                chunkedLoading
                maxClusterRadius={40}
            >
                {stops.filter(s => s.location && s.location.lat).map(stop => (
                    <Marker
                        key={stop.id}
                        position={[stop.location!.lat, stop.location!.lng]}
                        icon={getIconForP50(stop.metrics?.p50_wait_min ?? null)}
                    >
                        <Popup className="vrnp-popup">
                            <div className="font-sans w-56">
                                <div className="font-bold text-gray-900 border-b border-gray-100 pb-2 mb-2 flex items-start gap-1">
                                    <MapPin size={16} className="mt-0.5 text-gray-400 flex-shrink-0" />
                                    <span>{stop.name}</span>
                                </div>

                                {stop.metrics ? (
                                    <div className="space-y-2 mb-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500 flex items-center gap-1"><Clock size={14} /> Mediana</span>
                                            <span className={`font-black px-1.5 py-0.5 rounded text-white ${getColorBlockForP50(stop.metrics.p50_wait_min)}`}>
                                                {stop.metrics.p50_wait_min}m
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500">Atraso (P90)</span>
                                            <span className="font-semibold text-gray-700">{stop.metrics.p90_wait_min}m</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500 flex items-center gap-1"><Users size={14} /> Amostras</span>
                                            <span className="font-mono text-gray-600">{stop.metrics.samples}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-sm text-gray-500 italic mb-3">
                                        Amostragem insuficiente neste ponto nos últimos 30 dias.
                                    </div>
                                )}

                                <a
                                    href={`/ponto/${stop.id}`}
                                    className="pt-2 text-indigo-600 hover:text-indigo-800 font-semibold text-sm flex items-center gap-1 border-t border-gray-100"
                                >
                                    Abrir Detalhes <ArrowRight size={14} />
                                </a>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MarkerClusterGroup>
        </MapContainer>
    );
}
