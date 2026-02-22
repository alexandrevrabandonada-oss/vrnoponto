"use client";

import { MapContainer, TileLayer, Circle, Popup, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowRight, MapPin } from 'lucide-react';
import { TrustMixBadge } from './TrustMixBadge';
import L from 'leaflet';

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type NeighborhoodGeoJSON = any;

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

function PopupContent({ neighborhood, avg_delta_min, stops_count, samples_total, pct_verified_avg, risk_band }: {
    neighborhood: string; avg_delta_min: number; stops_count: number; samples_total: number; pct_verified_avg: number; risk_band: string;
}) {
    const color = getRiskColor(risk_band);
    return (
        <div className="font-sans w-60">
            <div className="font-bold text-gray-900 border-b border-gray-100 pb-2 mb-2 flex items-center gap-1">
                <MapPin size={16} className="text-gray-400 flex-shrink-0" />
                <span>{neighborhood}</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: color }}>
                    {getRiskLabel(risk_band)}
                </span>
            </div>
            <div className="space-y-1.5 mb-3 text-sm">
                <div className="flex justify-between">
                    <span className="text-gray-500">Atraso médio</span>
                    <span className="font-black" style={{ color }}>+{avg_delta_min} min</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-500">Pontos</span>
                    <span className="font-semibold text-gray-700">{stops_count}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-500">Amostras</span>
                    <span className="font-mono text-gray-600">{samples_total}</span>
                </div>
                <div className="pt-1.5 border-t border-gray-100 flex justify-center">
                    <TrustMixBadge total={samples_total} pctVerified={pct_verified_avg} />
                </div>
            </div>
            <a
                href={`/bairro/${encodeURIComponent(neighborhood)}`}
                className="pt-2 text-brand hover:brightness-110 font-bold text-sm flex items-center gap-1 border-t border-gray-100"
            >
                Ver detalhes <ArrowRight size={14} />
            </a>
        </div>
    );
}

export default function NeighborhoodMapComponent({
    neighborhoods = [],
    geojsonData,
    mode = 'circles',
}: {
    neighborhoods?: NeighborhoodMapItem[];
    geojsonData?: NeighborhoodGeoJSON;
    mode?: 'circles' | 'polygons';
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

            {mode === 'polygons' && geojsonData ? (
                <GeoJSON
                    data={geojsonData}
                    style={(feature) => {
                        const band = feature?.properties?.risk_band || 'OK';
                        const color = getRiskColor(band);
                        return {
                            color,
                            fillColor: color,
                            fillOpacity: 0.2,
                            weight: 2.5,
                        };
                    }}
                    onEachFeature={(feature, layer) => {
                        const p = feature.properties;
                        const html = `
                            <div style="font-family:sans-serif;width:240px">
                                <div style="font-weight:bold;font-size:14px;border-bottom:1px solid #eee;padding-bottom:6px;margin-bottom:6px">${p.neighborhood}</div>
                                <div style="display:inline-block;font-size:10px;font-weight:900;padding:2px 8px;border-radius:99px;color:white;background:${getRiskColor(p.risk_band)}">${getRiskLabel(p.risk_band)}</div>
                                <div style="margin-top:8px;font-size:13px">
                                    <div style="display:flex;justify-content:space-between"><span style="color:#6b7280">Atraso médio</span><strong style="color:${getRiskColor(p.risk_band)}">+${p.avg_delta_min}m</strong></div>
                                    <div style="display:flex;justify-content:space-between"><span style="color:#6b7280">Pontos</span><span>${p.stops_count}</span></div>
                                    <div style="display:flex;justify-content:space-between"><span style="color:#6b7280">Amostras</span><span>${p.samples_total}</span></div>
                                    <div style="display:flex;justify-content:space-between"><span style="color:#6b7280">Verificado</span><span>${p.pct_verified_avg}%</span></div>
                                </div>
                                <a href="/bairro/${encodeURIComponent(p.neighborhood)}" style="display:block;margin-top:8px;color:#facc15;font-weight:600;font-size:13px;text-decoration:none">Ver detalhes →</a>
                            </div>
                        `;
                        layer.bindPopup(L.popup().setContent(html));
                    }}
                />
            ) : (
                <>
                    {neighborhoods.filter(n => n.lat && n.lng).map(n => {
                        const color = getRiskColor(n.risk_band);
                        return (
                            <Circle
                                key={n.neighborhood}
                                center={[n.lat, n.lng]}
                                radius={n.radius_m}
                                pathOptions={{ color, fillColor: color, fillOpacity: 0.25, weight: 3 }}
                            >
                                <Popup className="vrnp-popup">
                                    <PopupContent {...n} />
                                </Popup>
                            </Circle>
                        );
                    })}
                </>
            )}
        </MapContainer>
    );
}
