'use client';

import { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Card, CardContent, 
  Grid, Container, Chip, CircularProgress, Alert,
  TextField, List, ListItem, ListItemText 
} from '@mui/material';
import TimerIcon from '@mui/icons-material/Timer';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

const ACCENT = '#FF6B00';

interface Race {
  id: string;
  title: string;
  data?: {
    title?: string;
    status?: string;
    timerStart?: number;
    timerStop?: number;
  };
}

export default function AdminDashboard({ initialRaces = [] }: { initialRaces: Race[] }) {
  const [races, setRaces] = useState<Race[]>(initialRaces);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para Meta de Llegada
  const [bibInput, setBibInput] = useState<Record<string, string>>({});
  const [recentFinishes, setRecentFinishes] = useState<Record<string, any[]>>({});

  const registerFinish = async (raceId: string, timerStart: number) => {
    const bib = bibInput[raceId]?.trim();
    if (!bib) return;

    setLoading(raceId);
    setError(null);
    const finishTime = Math.floor(Date.now() / 1000) - timerStart;

    try {
      const res = await fetch('/api/admin/register-finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raceId, bibNumber: bib, finishTime })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrar llegada');
      
      // Limpiar input y agregar a la lista de recientes
      setBibInput(prev => ({ ...prev, [raceId]: '' }));
      setRecentFinishes(prev => {
        const raceFinishes = prev[raceId] || [];
        return {
          ...prev,
          [raceId]: [data.participant, ...raceFinishes].slice(0, 10) // Mantener últimos 10
        };
      });
      
      // Feedback visual opcional
      const beep = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU');
      beep.play().catch(() => {}); // Intentar sonido tipo scanner
      
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  };

  const updateRace = async (id: string, updates: any) => {
    setLoading(id);
    setError(null);
    try {
      const res = await fetch('/api/admin/update-race', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates })
      });
      
      if (!res.ok) throw new Error('Error al actualizar la carrera');
      
      // Actualizamos el estado local
      setRaces(prev => prev.map(r => 
        r.id === id ? { ...r, data: { ...r.data, ...updates } } : r
      ));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  };

  const startTimer = (id: string) => {
    updateRace(id, { 
      timerStart: Math.floor(Date.now() / 1000), 
      timerStop: null,
      status: 'active' 
    });
  };

  const stopTimer = (id: string) => {
    updateRace(id, { 
      timerStop: Math.floor(Date.now() / 1000)
    });
  };

  const resetTimer = (id: string) => {
    if (confirm('¿Estás seguro de reiniciar el cronómetro?')) {
      updateRace(id, { 
        timerStart: null, 
        timerStop: null
      });
    }
  };

  const [now, setNow] = useState(Math.floor(Date.now() / 1000));

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h3" sx={{ fontWeight: 900, mb: 1 }}>
          PANEL DE <Box component="span" sx={{ color: ACCENT }}>CONTROL</Box>
        </Typography>
        <Typography color="text.secondary">Gestión de carreras y cronómetros en vivo</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>}

      <Grid container spacing={3}>
        {races.map((race) => (
          <Grid key={race.id} sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
            <Card sx={{ 
              borderRadius: 4, 
              bgcolor: 'background.paper',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              border: '1px solid',
              borderColor: race.data?.status === 'active' ? ACCENT : 'divider'
            }}>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                      {race.data?.title || race.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">ID: {race.id}</Typography>
                  </Box>
                  <Chip 
                    label={race.data?.status?.toUpperCase() || 'INACTIVE'} 
                    color={race.data?.status === 'active' ? 'success' : 'default'}
                    sx={{ fontWeight: 'bold' }}
                  />
                </Box>

                <Box sx={{ 
                  bgcolor: '#000', 
                  borderRadius: 3, 
                  p: 3, 
                  mb: 4, 
                  textAlign: 'center',
                  border: '1px solid #333'
                }}>
                  <Typography variant="h4" sx={{ color: ACCENT, fontFamily: 'monospace', fontWeight: 'bold' }}>
                    {race.data?.timerStart 
                      ? formatTime((race.data.timerStop || now) - race.data.timerStart) 
                      : '00:00'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'grey.500' }}>
                    {race.data?.timerStart 
                      ? (race.data.timerStop ? 'Carrera finalizada' : `En curso (Inicio: ${new Date(race.data.timerStart * 1000).toLocaleTimeString()})`) 
                      : 'Listo para iniciar'}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  {!race.data?.timerStart ? (
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={loading === race.id ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
                      onClick={() => startTimer(race.id)}
                      disabled={!!loading}
                      sx={{ bgcolor: ACCENT, py: 1.5, '&:hover': { bgcolor: '#E55A00' } }}
                    >
                      INICIAR
                    </Button>
                  ) : (
                    <>
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={loading === race.id ? <CircularProgress size={20} color="inherit" /> : <StopIcon />}
                        onClick={() => stopTimer(race.id)}
                        disabled={!!loading || !!race.data?.timerStop}
                        sx={{ color: '#ff4444', borderColor: '#ff4444', '&:hover': { borderColor: '#cc0000', bgcolor: 'rgba(255,0,0,0.05)' } }}
                      >
                        DETENER
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => resetTimer(race.id)}
                        disabled={!!loading}
                        sx={{ minWidth: 56 }}
                      >
                        <RestartAltIcon />
                      </Button>
                    </>
                  )}
                </Box>

                {/* --- SECCIÓN META DE LLEGADA --- */}
                {race.data?.timerStart && !race.data?.timerStop && (
                  <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                      🏁 Meta de Llegadas
                    </Typography>
                    <Box component="form" onSubmit={(e) => {
                      e.preventDefault();
                      if (bibInput[race.id]?.trim()) {
                        registerFinish(race.id, race.data!.timerStart!);
                      }
                    }} sx={{ display: 'flex', gap: 1 }}>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="Escanear o teclear Dorsal"
                        value={bibInput[race.id] || ''}
                        onChange={(e) => setBibInput(prev => ({ ...prev, [race.id]: e.target.value }))}
                        disabled={!!loading}
                        autoComplete="off"
                        InputProps={{
                          sx: { fontWeight: 'bold', fontSize: '1.2rem' }
                        }}
                      />
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={!!loading || !bibInput[race.id]}
                        sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#E55A00' } }}
                      >
                        Registrar
                      </Button>
                    </Box>
                    
                    {/* Lista de Llegadas Recientes */}
                    {recentFinishes[race.id]?.length > 0 && (
                      <Box sx={{ mt: 3, bgcolor: 'background.default', borderRadius: 2, p: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                          ÚLTIMOS REGISTROS
                        </Typography>
                        <List dense disablePadding>
                          {recentFinishes[race.id].map((finish: any, i: number) => (
                            <ListItem key={i} disablePadding sx={{ py: 0.5, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                              <ListItemText 
                                primary={
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                      #{finish.bibNumber} - {finish.name}
                                    </Typography>
                                    <Typography variant="body2" color="success.main" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                                      {formatTime(finish.finishTime)}
                                    </Typography>
                                  </Box>
                                }
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
