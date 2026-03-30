'use client';

import { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Card, CardContent, 
  Grid, Container, Chip, CircularProgress, Alert,
  TextField, List, ListItem, ListItemText,
  Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Select, MenuItem, FormControl, InputLabel
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
  
  // Estados para Tabs y Códigos
  const [tabIndex, setTabIndex] = useState(0);
  const [vendorInput, setVendorInput] = useState('');
  const [codeRaceId, setCodeRaceId] = useState('');
  const [codeQuantity, setCodeQuantity] = useState<number | ''>('');
  const [codeStats, setCodeStats] = useState<any[]>([]);
  const [allCodes, setAllCodes] = useState<any[]>([]);
  const [codesLoading, setCodesLoading] = useState(false);

  const fetchCodeStats = async () => {
    try {
      setCodesLoading(true);
      const res = await fetch('/api/admin/codes-stats');
      const data = await res.json();
      if (data.success) {
         setCodeStats(data.stats);
         setAllCodes(data.codes || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCodesLoading(false);
    }
  };

  useEffect(() => {
    if (tabIndex === 1) fetchCodeStats();
  }, [tabIndex]);

  const generateCodes = async () => {
    if (!vendorInput || !codeRaceId || !codeQuantity) {
      alert("Por favor llena todos los campos de vendedor, carrera y cantidad");
      return;
    }
    try {
      setCodesLoading(true);
      const res = await fetch('/api/admin/bulk-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor: vendorInput, raceId: codeRaceId, quantity: Number(codeQuantity) })
      });
      const data = await res.json();
      if (data.success) {
        setVendorInput('');
        setCodeQuantity('');
        fetchCodeStats();
        alert(`Se han generado ${data.codesGenerated} códigos para el lote ${data.batchId}`);
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert("Error al intentar generar los códigos");
    } finally {
      setCodesLoading(false);
    }
  };

  const markCodesSold = async (batchId: string, vendor: string, qty: string) => {
    const qtyNum = parseInt(qty || '0', 10);
    if (qtyNum <= 0) return;
    try {
      setCodesLoading(true);
      const res = await fetch('/api/admin/mark-sold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId, vendor, qtyToMark: qtyNum })
      });
      const data = await res.json();
      if (data.success) {
        fetchCodeStats();
        alert(`Se han marcado ${data.marked} códigos como vendidos de ${vendor}.`);
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert("Error marcando vendidos.");
    } finally {
      setCodesLoading(false);
    }
  };

  const exportCSV = (batchId: string) => {
    const batchCodes = allCodes.filter((c: any) => c.batchId === batchId);
    if (batchCodes.length === 0) return alert("No hay detalles de códigos cargados para este lote.");
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID Lote,Vendedor,Titulo Boleto,Codigo Físico,Web Status\r\n";
    
    batchCodes.forEach((c: any) => {
        csvContent += `${c.batchId},${c.vendor},${c.title},${c.code},${c.status}\r\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `CodigosFisicos_${batchId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
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
        <Typography color="text.secondary">Gestión de carreras y códigos físicos</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs 
          value={tabIndex} 
          onChange={(e, v) => setTabIndex(v)} 
          centered 
          textColor="inherit"
          TabIndicatorProps={{ style: { backgroundColor: ACCENT } }}
          sx={{
            mb: 2,
            '& .MuiTab-root': { 
                fontWeight: 'bold',
                fontSize: { xs: '0.8rem', md: '1rem' },
                opacity: 0.6,
                transition: 'opacity 0.2s'
            },
            '& .Mui-selected': { 
                color: `${ACCENT} !important`,
                opacity: 1
            }
          }}
        >
          <Tab label="Cronometraje en Vivo" />
          <Tab label="Gestión de Códigos Físicos" />
        </Tabs>
      </Box>

      {tabIndex === 0 && (
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
      )}

      {tabIndex === 1 && (
        <Box>
          <Card sx={{ mb: 4, p: 2, borderRadius: 4 }}>
            <CardContent>
              <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>Generar Nuevo Lote</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 200, flex: 1 }}>
                  <InputLabel>Carrera Destino</InputLabel>
                  <Select value={codeRaceId} label="Carrera Destino" onChange={(e) => setCodeRaceId(e.target.value)}>
                    {races.map(r => <MenuItem key={r.id} value={r.id}>{r.data?.title || r.title || 'Carrera'}</MenuItem>)}
                  </Select>
                </FormControl>
                
                <TextField size="small" sx={{ minWidth: 250, flex: 1 }} label="Vendedor Físico (Punto de Venta)" placeholder="Ej. Tienda Running" value={vendorInput} onChange={e => setVendorInput(e.target.value)} />
                
                <TextField type="number" size="small" sx={{ width: 120 }} label="Cantidad" placeholder="Ej. 20" value={codeQuantity} onChange={e => setCodeQuantity(e.target.value ? Number(e.target.value) : '')} />
                
                <Button variant="contained" onClick={generateCodes} disabled={codesLoading} sx={{ py: 1, px: 3, bgcolor: ACCENT, '&:hover': { bgcolor: '#E55A00' } }}>
                  {codesLoading ? 'PROCESANDO...' : 'GENERAR CÓDIGOS'}
                </Button>
              </Box>
            </CardContent>
          </Card>
          
          <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>Seguimiento por Vendedor y Lote</Typography>
          <TableContainer component={Paper} sx={{ borderRadius: 4, bgcolor: 'background.paper' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell><strong>Vendedor</strong></TableCell>
                  <TableCell><strong>ID de Lote</strong></TableCell>
                  <TableCell align="center"><strong>Total Impresos</strong></TableCell>
                  <TableCell align="center"><strong>Faltan x Vender</strong></TableCell>
                  <TableCell align="center"><strong>Faltan x Canjear</strong></TableCell>
                  <TableCell align="center"><strong>Canjes Exitosos</strong></TableCell>
                  <TableCell align="center"><strong>Acciones</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {codeStats.length === 0 ? <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}>No hay códigos registrados</TableCell></TableRow> : codeStats.map((stat, i) => (
                  <TableRow key={i}>
                    <TableCell sx={{ fontWeight: 'bold' }}>{stat.vendor}</TableCell>
                    <TableCell><Chip label={stat.batchId} size="small" /></TableCell>
                    <TableCell align="center">{stat.total}</TableCell>
                    <TableCell align="center"><Typography color="success.main" fontWeight="bold">{stat.generated}</Typography></TableCell>
                    <TableCell align="center">{stat.sold}</TableCell>
                    <TableCell align="center"><Typography color="info.main">{stat.redeemed}</Typography></TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'center' }}>
                         <Button size="small" variant="outlined" onClick={() => {
                            const qty = prompt(`¿Cuántos de los ${stat.generated} códigos generados que tiene ${stat.vendor} fueron concretados/vendidos exitosamente por ellos?`, "1");
                            if (qty) markCodesSold(stat.batchId, stat.vendor, qty);
                         }} disabled={stat.generated === 0 || codesLoading}>
                           Marcar Venta
                         </Button>
                         <Button size="small" variant="contained" sx={{ bgcolor: '#333', color: 'white', '&:hover': { bgcolor: '#000' } }} onClick={() => exportCSV(stat.batchId)}>
                           Exportar CSV
                         </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Container>
  );
}
