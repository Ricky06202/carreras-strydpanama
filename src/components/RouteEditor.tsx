'use client';

import { useState, useEffect, useRef } from 'react';
import { Box, Button, Typography, Alert } from '@mui/material';
import { MapContainer, TileLayer, Polyline, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const ACCENT = '#FF6B00';

const startIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface RouteEditorProps {
  routeGeoJson: string | null;
  onSave: (geoJson: string) => void;
}

function MapEvents({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

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

export default function RouteEditor({ routeGeoJson, onSave }: RouteEditorProps) {
  const [coordinates, setCoordinates] = useState<[number, number][]>([]);
  const [mode, setMode] = useState<'draw' | 'view'>('draw');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (routeGeoJson) {
      try {
        const parsed = JSON.parse(routeGeoJson);
        if (Array.isArray(parsed)) {
          setCoordinates(parsed);
        }
      } catch {
        setCoordinates([]);
      }
    }
  }, [routeGeoJson]);

  const handleMapClick = (lat: number, lng: number) => {
    if (mode === 'draw') {
      setCoordinates([...coordinates, [lat, lng]]);
    }
  };

  const handleUndo = () => {
    if (coordinates.length > 0) {
      setCoordinates(coordinates.slice(0, -1));
    }
  };

  const handleClear = () => {
    setCoordinates([]);
  };

  const handleSave = () => {
    if (coordinates.length < 2) {
      return;
    }
    onSave(JSON.stringify(coordinates));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const center: [number, number] = coordinates.length > 0 
    ? coordinates[Math.floor(coordinates.length / 2)]
    : [8.9824, -79.5199]; // Default to Panama City

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          {mode === 'draw' ? 'Dibujar Ruta' : 'Ver Ruta'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            size="small" 
            variant={mode === 'draw' ? 'contained' : 'outlined'}
            onClick={() => setMode('draw')}
            sx={{ bgcolor: mode === 'draw' ? ACCENT : undefined }}
          >
            Dibujar
          </Button>
          <Button 
            size="small" 
            variant={mode === 'view' ? 'contained' : 'outlined'}
            onClick={() => setMode('view')}
            sx={{ bgcolor: mode === 'view' ? ACCENT : undefined }}
          >
            Ver
          </Button>
        </Box>
      </Box>

      {mode === 'draw' && (
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Button size="small" variant="outlined" onClick={handleUndo} disabled={coordinates.length === 0}>
            Deshacer
          </Button>
          <Button size="small" variant="outlined" onClick={handleClear} disabled={coordinates.length === 0}>
            Limpiar
          </Button>
          <Button 
            size="small" 
            variant="contained" 
            onClick={handleSave} 
            disabled={coordinates.length < 2}
            sx={{ bgcolor: ACCENT }}
          >
            Guardar Ruta
          </Button>
        </Box>
      )}

      {saved && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Ruta guardada correctamente
        </Alert>
      )}

      {mode === 'draw' && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Haz clic en el mapa para agregar puntos a la ruta. Minimum 2 puntos.
        </Typography>
      )}

      <Box sx={{ height: 400, borderRadius: 2, overflow: 'hidden' }}>
        <MapContainer 
          center={center} 
          zoom={13} 
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapEvents onMapClick={handleMapClick} />
          <FitBounds coordinates={coordinates} />
          
          {coordinates.length > 0 && (
            <>
              <Polyline 
                positions={coordinates} 
                color={ACCENT} 
                weight={4}
                opacity={0.8}
              />
              <Marker position={coordinates[0]} icon={startIcon} />
            </>
          )}
        </MapContainer>
      </Box>
    </Box>
  );
}
