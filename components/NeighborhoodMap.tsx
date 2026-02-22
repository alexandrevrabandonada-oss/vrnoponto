"use client";

import { MapContainer, TileLayer, Circle, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowRight, MapPin } from 'lucide-react';
import { TrustMixBadge } from './TrustMixBadge';

export type NeighborhoodMapItem = {
    neighborhood: string;
    lat: number;
    lng: number;
    avg_delta_min: number;
    stops_count: number;
    samples_total: number;
    pct_verified_avg: number;
    risk_band: 'OK' | 'ATTENTION' | 'BAD' | 'CRIT';
    radius_m: number;
};

function getRiskColor(band: string): string {
    switch (band) {
        case 'CRIT': return '#ef4444';
        case 'BAD': return '#f97316';
        case 'ATTENTION': return '#f59e0b';
        default: return '#10b981';
    }
}

function getRiskLabel(band: string): string {
    switch (band) {
        case 'CRIT': return 'CRÍTICO';
        case 'BAD': return 'RUIM';
        case 'ATTENTION': return 'ATENÇÃO';
        default: return 'OK';
    }
}

export default function NeighborhoodMapComponent({
    neighborhoods = [],
}: {
    neighborhoods?: NeighborhoodMapItem[];
}) {
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
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {neighborhoods.filter(n => n.lat && n.lng).map(n => {
                const color = getRiskColor(n.risk_band);
                return (
                    <Circle
                        key={n.neighborhood}
                        center={[n.lat, n.lng]}
                        radius={n.radius_m}
                        pathOptions={{
                            color,
                            fillColor: color,
                            fillOpacity: 0.25,
                            weight: 3,
                        }}
                    >
                        <Popup className="vrnp-popup">
                            <div className="font-sans w-60">
                                <div className="font-bold text-gray-900 border-b border-gray-100 pb-2 mb-2 flex items-center gap-1">
                                    <MapPin size={16} className="text-gray-400 flex-shrink-0" />
                                    <span>{n.neighborhood}</span>
                                </div>

                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: color }}>
                                        {getRiskLabel(n.risk_band)}
                                    </span>
                                </div>

                                <div className="space-y-1.5 mb-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Atraso médio</span>
                                        <span className="font-black" style={{ color }}>+{n.avg_delta_min} min</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Pontos</span>
                                        <span className="font-semibold text-gray-700">{n.stops_count}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Amostras</span>
                                        <span className="font-mono text-gray-600">{n.samples_total}</span>
                                    </div>
                                    <div className="pt-1.5 border-t border-gray-100 flex justify-center">
                                        <TrustMixBadge total={n.samples_total} pctVerified={n.pct_verified_avg} />
                                    </div>
                                </div>

                                <a
                                    href={`/bairro/${encodeURIComponent(n.neighborhood)}`}
                                    className="pt-2 text-indigo-600 hover:text-indigo-800 font-semibold text-sm flex items-center gap-1 border-t border-gray-100"
                                >
                                    Ver detalhes <ArrowRight size={14} />
                                </a>
                            </div>
                        </Popup>
                    </Circle>
                );
            })}
        </MapContainer>
    );
}
