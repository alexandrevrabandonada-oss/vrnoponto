'use client';

import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { X } from 'lucide-react';

// Fix for default marker icons in Leaflet with Next.js
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface DraftMapModalProps {
    isOpen: boolean;
    onClose: () => void;
    draft: {
        name_suggested: string;
        lat: number;
        lng: number;
    } | null;
}

export function DraftMapModal({ isOpen, onClose, draft }: DraftMapModalProps) {
    if (!isOpen || !draft) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black text-white italic uppercase tracking-tight leading-none mb-1">
                            {draft.name_suggested}
                        </h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Verificação de Localização</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white/60 transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 min-h-[400px] relative z-0">
                    <MapContainer
                        center={[draft.lat, draft.lng]}
                        zoom={16}
                        scrollWheelZoom={true}
                        style={{ height: '100%', width: '100%' }}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker position={[draft.lat, draft.lng]}>
                            <Popup>
                                <span className="font-bold">{draft.name_suggested}</span>
                            </Popup>
                        </Marker>
                    </MapContainer>
                </div>

                <div className="p-6 bg-white/[0.02] border-t border-white/5">
                    <div className="flex items-center gap-4 text-[10px] font-mono text-white/40">
                        <span>LAT: {draft.lat.toFixed(6)}</span>
                        <span>LNG: {draft.lng.toFixed(6)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
