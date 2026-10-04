import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Typography, Paper, Button, Chip, List, ListItem, ListItemText, Divider, useTheme } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import RefreshIcon from '@mui/icons-material/Refresh';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PhotoCameraFrontIcon from '@mui/icons-material/PhotoCameraFront';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import GroupOffIcon from '@mui/icons-material/GroupOff';

const ACCENT = '#FF6B00';

interface CameraTimingViewProps {
  races: any[];
}

const formatTime = (totalSeconds: number) => {
  if (totalSeconds === undefined || totalSeconds === null || isNaN(totalSeconds)) return '--:--';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export default function CameraTimingView({ races }: CameraTimingViewProps) {
  const theme = useTheme();
  const [selectedRace, setSelectedRace] = useState<string>('');
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<number | null>(null);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin);
  }, []);

  const refresh = useCallback(async () => {
    if (!selectedRace) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/participants?raceId=${encodeURIComponent(selectedRace)}&_t=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Error al refrescar');
      setParticipants(Array.isArray(data.participants) ? data.participants : []);
      setLastRefresh(Date.now());
    } catch (e: any) {
      setError(e.message || 'Error al cargar llegadas');
    } finally {
      setLoading(false);
    }
  }, [selectedRace]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  const stats = useMemo(() => {
    const finishers = participants.filter(p => p.finishTime !== undefined && p.finishTime !== null && Number(p.finishTime) >= 0 && p.participantType !== 'padrino');
    const camera = finishers.filter(p => p.timingSource === 'camera').sort((a, b) => b.finishTime - a.finishTime);
    const manual = finishers.filter(p => p.timingSource !== 'camera');
    return { camera, manual, total: finishers.length, pending: participants.filter(p => p.participantType !== 'padrino' && (p.finishTime === undefined || p.finishTime === null)).length };
  }, [participants]);

  const endpointCamera = `${origin}/api/admin/register-finish-camera`;
  const endpointBibs = `${origin}/api/admin/race-bibs?raceId=${selectedRace || '...'}`;

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const monoBox = {
    fontFamily: 'monospace', fontSize: '0.75rem', p: 1.5, borderRadius: 2,
    bgcolor: theme.palette.mode === 'dark' ? '#0f0f0f' : '#f5f5f5',
    border: 1, borderColor: 'divider', wordBreak: 'break-all' as const,
  };

  const kpiCard = (title: string, value: number, icon: React.ReactNode, sub?: string) => (
    <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', border: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box sx={{ color: ACCENT }}>{icon}</Box>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 900, color: 'text.primary', lineHeight: 1 }}>{value}</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>{title}</Typography>
        {sub && <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>{sub}</Typography>}
      </Box>
    </Paper>
  );

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, mb: 0.5, color: ACCENT }}>Cronometraje con Cámara</Typography>
          <Typography variant="body2" color="text.secondary">
            Llegadas registradas automáticamente por lectura de dorsal (bibcam). El método manual sigue funcionando de forma independiente.
          </Typography>
        </Box>
        <select
          style={{ padding: '10px 15px', borderRadius: 8, backgroundColor: 'var(--mui-palette-background-paper, #2d2d2d)', color: 'inherit', border: `1px solid ${ACCENT}`, outline: 'none' }}
          value={selectedRace}
          onChange={(e) => setSelectedRace(e.target.value)}
        >
          <option value="">-- Selecciona una Carrera --</option>
          {races.map(r => <option key={r.id} value={r.id}>{r.data?.title || r.title}</option>)}
        </select>
      </Box>

      {error && <Paper sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: 'rgba(211,47,47,0.12)', border: 1, borderColor: 'error.main', color: 'error.main', fontWeight: 'bold' }}>{error}</Paper>}

      {/* Conexión / configuración del dispositivo */}
      <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', border: 1, borderColor: 'divider', mb: 4 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, color: 'text.primary' }}>⚙️ Configuración del dispositivo bibcam</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 'bold' }}>REGISTRO DE LLEGADAS (POST)</Typography>
              <Button size="small" startIcon={<ContentCopyIcon />} onClick={() => copy(endpointCamera)} sx={{ color: ACCENT, fontWeight: 'bold' }}>copiar</Button>
            </Box>
            <Box sx={monoBox}>{endpointCamera}</Box>
          </Box>
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 'bold' }}>WHITLIST DE DORSALES + CRONÓMETRO (GET)</Typography>
              <Button size="small" startIcon={<ContentCopyIcon />} onClick={() => copy(endpointBibs)} sx={{ color: ACCENT, fontWeight: 'bold' }}>copiar</Button>
            </Box>
            <Box sx={monoBox}>{endpointBibs}</Box>
          </Box>
        </Box>
        <Typography variant="caption" sx={{ display: 'block', mt: 2, color: 'text.secondary' }}>
          Ambos endpoints exigen el header <b>X-Timing-Key</b> cuando <b>TIMING_API_KEY</b> esté configurado en Cloudflare. Payload del POST:
          {' `'}{"{ raceId, bibNumber, finishTime (s desde timerStart), confidence (0-1), timerUsed? }"}{'`'}
        </Typography>
      </Paper>

      {/* KPIs */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 3, mb: 4 }}>
        {kpiCard('Por Cámara', stats.camera.length, <PhotoCameraFrontIcon />, 'llegadas OCR')}
        {kpiCard('Manuales', stats.manual.length, <TouchAppIcon />, 'scanner/tecleo')}
        {kpiCard('En Meta', stats.total, <VideocamIcon />, 'total finalistas')}
        {kpiCard('En Pista', stats.pending, <GroupOffIcon />, 'sin llegada')}
      </Box>

      {/* Feed de llegadas por cámara */}
      <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', border: 1, borderColor: ACCENT }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
            🏁 Llegadas por Cámara
            {lastRefresh && <Typography component="span" variant="caption" sx={{ ml: 1.5, color: 'text.secondary' }}>auto-refresh 5s · {new Date(lastRefresh).toLocaleTimeString()}</Typography>}
          </Typography>
          <Button size="small" startIcon={<RefreshIcon spin={loading} />} onClick={refresh} disabled={!selectedRace || loading} sx={{ color: ACCENT, fontWeight: 'bold' }}>
            Refrescar
          </Button>
        </Box>
        {!selectedRace ? (
          <Typography sx={{ py: 4, textAlign: 'center', color: 'text.secondary', fontStyle: 'italic' }}>Selecciona una carrera para ver las llegadas.</Typography>
        ) : stats.camera.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <VideocamIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.4 }} />
            <Typography sx={{ mt: 1, color: 'text.secondary', fontStyle: 'italic' }}>
              Aún no hay llegadas registradas por cámara. Cuando el dispositivo bibcam envíe eventos, aparecerán aquí en vivo.
            </Typography>
          </Box>
        ) : (
          <List disablePadding sx={{ maxHeight: 480, overflowY: 'auto' }}>
            {stats.camera.map((p: any, i: number) => (
              <ListItem key={p.id} sx={{ px: 1, py: 1, borderBottom: i < stats.camera.length - 1 ? '1px dashed' : 'none', borderColor: 'divider' }}>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                        📷 #{p.bibNumber} <Box component="span" sx={{ color: 'text.secondary', fontWeight: 500 }}>{p.firstName} {p.lastName}</Box>
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {p.timingConfidence !== undefined && (
                          <Chip size="small" label={`${Math.round(p.timingConfidence * 100)}%`} sx={{ fontWeight: 'bold', bgcolor: p.timingConfidence >= 0.9 ? 'rgba(46,125,50,0.15)' : 'rgba(255,193,7,0.15)', color: p.timingConfidence >= 0.9 ? '#4caf50' : '#ffc107' }} />
                        )}
                        <Typography variant="body1" sx={{ color: ACCENT, fontWeight: 900, fontFamily: 'monospace' }}>{formatTime(p.finishTime)}</Typography>
                      </Box>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
        <Divider sx={{ my: 2 }} />
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Nota: las llegadas registradas por cámara también alimentan resultados y tómbola igual que las manuales. Cualquier error de lectura se corrige desde "Directorio de Inscritos".
        </Typography>
      </Paper>
    </Box>
  );
}
