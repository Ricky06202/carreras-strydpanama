'use client';

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const startIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const endIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function FitBounds({ coordinates }: { coordinates: [number, number][] }) {
  const map = useMap();
  
  useEffect(() => {
    if (coordinates.length > 0) {
      const bounds = L.latLngBounds(coordinates);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [coordinates, map]);
  
  return null;
}

interface RouteViewerProps {
  routeGeoJson: string | null;
  raceName: string;
}

export default function RouteViewer({ routeGeoJson, raceName }: RouteViewerProps) {
  const [coordinates, setCoordinates] = useState<[number, number][]>([]);
  
  useEffect(() => {
    if (routeGeoJson) {
      try {
        const parsed = JSON.parse(routeGeoJson);
        const coords: [number, number][] = [];
        if (Array.isArray(parsed)) {
          parsed.forEach((coord: number[]) => {
            if (coord.length >= 2) {
              coords.push([coord[0], coord[1]]);
            }
          });
        }
        setCoordinates(coords);
      } catch {
        console.error('Error parsing routeGeoJson');
        setCoordinates([]);
      }
    } else {
      setCoordinates([]);
    }
  }, [routeGeoJson]);

  if (coordinates.length === 0) {
    return null;
  }

  const center: [number, number] = coordinates[Math.floor(coordinates.length / 2)];

  return (
    <div className="w-full h-96 rounded-lg overflow-hidden">
      <MapContainer 
        center={center} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds coordinates={coordinates} />
        
        <Polyline 
          positions={coordinates} 
          color="#FF6B00" 
          weight={4}
          opacity={0.8}
        />
        <Marker position={coordinates[0]} icon={startIcon} />
        <Marker position={coordinates[coordinates.length - 1]} icon={endIcon} />
      </MapContainer>
    </div>
  );
}
