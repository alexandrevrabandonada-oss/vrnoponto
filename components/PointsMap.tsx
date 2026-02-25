"use client";

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';

// Fix for default marker icons in Leaflet with Next.js
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

const SelectedIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [35, 51],
    iconAnchor: [17, 51],
    className: 'hue-rotate-[140deg] brightness-125' // Makes it look brand-colored/green
});

L.Marker.prototype.options.icon = DefaultIcon;

interface Stop {
    id: string;
    name: string;
    neighborhood: string;
    lat: number;
    lng: number;
}

interface PointsMapProps {
    stops: Stop[];
    selectedId: string | null;
    onSelect: (stop: Stop) => void;
    center?: [number, number];
    zoom?: number;
}

function MapUpdater({ center, zoom }: { center: [number, number], zoom: number }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom);
    }, [center, zoom, map]);
    return null;
}

export default function PointsMap({ stops, selectedId, onSelect, center, zoom }: PointsMapProps) {
    const defaultCenter: [number, number] = center || [-22.518, -44.095];
    const defaultZoom = zoom || 15;

    return (
        <MapContainer
            center={defaultCenter}
            zoom={defaultZoom}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%', zIndex: 0 }}
            zoomControl={false} // We'll handle UI elsewhere or leave clean
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapUpdater center={defaultCenter} zoom={defaultZoom} />

            {stops.map(stop => (
                <Marker
                    key={stop.id}
                    position={[stop.lat, stop.lng]}
                    icon={selectedId === stop.id ? SelectedIcon : DefaultIcon}
                    eventHandlers={{
                        click: () => onSelect(stop),
                    }}
                />
            ))}
        </MapContainer>
    );
}
