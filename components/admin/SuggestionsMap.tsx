"use client";

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import MarkerClusterGroup_ from 'react-leaflet-cluster';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MarkerClusterGroup = MarkerClusterGroup_ as any;
import 'leaflet/dist/leaflet.css';

// Fix default icon paths for Next.js
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

// Colored icons by confirmation level
function createSuggestionIcon(confirmations: number, isSelected: boolean) {
    let color = '#6b7280'; // gray (1 confirmation)
    let size = 22;

    if (confirmations >= 4) {
        color = '#ef4444'; // red (critical)
        size = 30;
    } else if (confirmations >= 2) {
        color = '#eab308'; // yellow (highlighted)
        size = 26;
    }

    const border = isSelected
        ? 'border: 3px solid #00ffaa; box-shadow: 0 0 12px rgba(0,255,170,0.6);'
        : 'border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);';

    return L.divIcon({
        className: 'custom-suggestion-icon',
        html: `<div style='
            background-color:${color};
            width: ${size}px; height: ${size}px;
            border-radius: 50%;
            ${border}
            display: flex; align-items: center; justify-content: center;
            color: white; font-size: ${size * 0.45}px; font-weight: 900;
        '>${confirmations > 1 ? confirmations : ''}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
    });
}

interface SuggestionItem {
    id: string;
    name_suggested: string;
    confirmations: number;
    created_at: string;
    lat: number;
    lng: number;
    notes: string | null;
    neighborhood_text: string | null;
}

interface SuggestionsMapProps {
    suggestions: SuggestionItem[];
    selectedId: string | null;
    onSelect: (suggestion: SuggestionItem) => void;
}

export default function SuggestionsMap({ suggestions, selectedId, onSelect }: SuggestionsMapProps) {
    // Volta Redonda center
    const defaultCenter: [number, number] = [-22.518, -44.095];
    const defaultZoom = 13;

    return (
        <MapContainer
            center={defaultCenter}
            zoom={defaultZoom}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%', zIndex: 0 }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MarkerClusterGroup
                chunkedLoading
                maxClusterRadius={40}
            >
                {suggestions.map(s => (
                    <Marker
                        key={s.id}
                        position={[s.lat, s.lng]}
                        icon={createSuggestionIcon(s.confirmations, s.id === selectedId)}
                        eventHandlers={{
                            click: () => onSelect(s),
                        }}
                    >
                        <Popup>
                            <div className="font-sans w-48 text-sm">
                                <strong>{s.name_suggested}</strong>
                                {s.confirmations > 1 && (
                                    <span className="ml-1 text-xs text-brand font-bold">({s.confirmations}×)</span>
                                )}
                                {s.notes && <p className="text-xs text-gray-500 mt-1">{s.notes}</p>}
                                <p className="text-[10px] text-gray-400 mt-1">Clique para abrir painel →</p>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MarkerClusterGroup>
        </MapContainer>
    );
}
