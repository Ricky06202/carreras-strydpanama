'use client';

import { useState, useEffect } from 'react';
import {
  Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Box, Typography, Chip, Tabs, Tab, Snackbar, Alert,
  AppBar, Toolbar, IconButton, ThemeProvider, createTheme, CssBaseline
} from '@mui/material';
import { Link } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import VpnKeyIcon from '@mui/icons-material/VpnKey';

const ACCENT = '#FF6B00';

function getInitialTheme(): 'light' | 'dark' {
  if (typeof document !== 'undefined') {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  }
  return 'light';
}

interface Race {
  id: string;
  name: string;
  description: string;
  date: string;
  status: string;
  location: string;
  price: number;
  maxParticipants: number;
}

interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  paymentStatus: string;
  size: string;
}

interface RegistrationCode {
  id: string;
  code: string;
  used: number;
}

export default function AdminDashboard() {
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const [races, setRaces] = useState<Race[]>([]);
  const [selectedRace, setSelectedRace] = useState<Race | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [codes, setCodes] = useState<RegistrationCode[]>([]);
  const [tab, setTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [editRace, setEditRace] = useState<Race | null>(null);
  const [openCodesDialog, setOpenCodesDialog] = useState(false);
  const [codesCount, setCodesCount] = useState(10);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', date: '', location: '', price: 0, maxParticipants: '' });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMode(getInitialTheme());
    setMounted(true);
    fetch('/api/races').then(r => r.json()).then(d => setRaces(d.races || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const handleThemeChange = (e: CustomEvent<{ mode: 'light' | 'dark' }>) => {
      setMode(e.detail.mode);
    };
    window.addEventListener('themechange', handleThemeChange as EventListener);
    return () => window.removeEventListener('themechange', handleThemeChange as EventListener);
  }, []);

  useEffect(() => {
    if (selectedRace) {
      fetch(`/api/admin/race/${selectedRace.id}`).then(r => r.json()).then(d => {
        setSelectedRace(d.race);
        setParticipants(d.participants || []);
        setCodes(d.codes || []);
      }).catch(() => {});
    }
  }, [selectedRace?.id]);

  const theme = createTheme({
    palette: {
      mode,
      primary: { main: ACCENT },
      background: {
        default: mode === 'dark' ? '#111827' : '#F9FAFB',
        paper: mode === 'dark' ? '#1F2937' : '#FFFFFF',
      },
    },
  });

  const sidebarBg = mode === 'dark' ? '#1F2937' : '#FFFFFF';
  const mainBg = mode === 'dark' ? '#111827' : '#F9FAFB';
  const textColor = mode === 'dark' ? '#F9FAFB' : '#111827';
  const secondaryTextColor = mode === 'dark' ? '#9CA3AF' : '#6B7280';

  const toggleTheme = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(newMode);
    localStorage.setItem('theme', newMode);
    window.dispatchEvent(new CustomEvent('themechange', { detail: { mode: newMode } }));
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSaveRace = async () => {
    const method = editRace ? 'PUT' : 'POST';
    const url = editRace ? `/api/admin/race/${editRace.id}` : '/api/admin/race';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants) : null })
    });
    const data = await res.json();
    if (res.ok) {
      showNotification(editRace ? 'Carrera actualizada' : 'Carrera creada', 'success');
      setOpenDialog(false);
      fetch('/api/races').then(r => r.json()).then(d => setRaces(d.races || [])).catch(() => {});
    } else {
      showNotification(data.message, 'error');
    }
  };

  const handleStartRace = async () => {
    if (!selectedRace) return;
    const res = await fetch('/api/admin/start-race', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raceId: selectedRace.id })
    });
    const data = await res.json();
    if (res.ok) {
      showNotification('¡Carrera iniciada!', 'success');
      fetch(`/api/admin/race/${selectedRace.id}`).then(r => r.json()).then(d => setSelectedRace(d.race)).catch(() => {});
    } else {
      showNotification(data.message, 'error');
    }
  };

  const handleGenerateCodes = async () => {
    if (!selectedRace) return;
    const res = await fetch('/api/admin/generate-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raceId: selectedRace.id, count: codesCount })
    });
    const data = await res.json();
    if (res.ok) {
      showNotification(`${data.codes.length} códigos generados`, 'success');
      setOpenCodesDialog(false);
      fetch(`/api/admin/race/${selectedRace.id}`).then(r => r.json()).then(d => setCodes(d.codes || [])).catch(() => {});
    } else {
      showNotification(data.message, 'error');
    }
  };

  const handleDeleteRace = async (id: string) => {
    if (!confirm('¿Eliminar esta carrera?')) return;
    const res = await fetch(`/api/admin/race/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showNotification('Carrera eliminada', 'success');
      if (selectedRace?.id === id) setSelectedRace(null);
      fetch('/api/races').then(r => r.json()).then(d => setRaces(d.races || [])).catch(() => {});
    }
  };

  const exportCSV = () => {
    const headers = ['Nombre', 'Apellido', 'Email', 'Teléfono', 'Talla', 'Estado'];
    const rows = participants.map(p => [p.firstName, p.lastName, p.email, p.phone, p.size, p.paymentStatus].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `participantes-${selectedRace?.name || 'race'}.csv`;
    a.click();
  };

  const openEdit = (race?: Race) => {
    if (race) {
      setEditRace(race);
      setFormData({ name: race.name, description: race.description || '', date: race.date, location: race.location || '', price: race.price, maxParticipants: race.maxParticipants?.toString() || '' });
    } else {
      setEditRace(null);
      setFormData({ name: '', description: '', date: '', location: '', price: 0, maxParticipants: '' });
    }
    setOpenDialog(true);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('es-PA');

  if (!mounted) {
    return null;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: mainBg }}>
        {/* Header */}
        <AppBar position="sticky" sx={{ bgcolor: sidebarBg, boxShadow: 1 }}>
          <Toolbar>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1 }}>
              <Link href="/" underline="none" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: ACCENT, fontWeight: 'bold' }}>
                <ArrowBackIcon />
                Volver
              </Link>
              <Typography variant="h6" sx={{ color: ACCENT, fontWeight: 'bold' }}>
                <AdminPanelSettingsIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                Admin
              </Typography>
            </Box>
            <IconButton onClick={toggleTheme} sx={{ bgcolor: 'action.hover' }}>
              {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Toolbar>
        </AppBar>

        <Box sx={{ display: 'flex' }}>
          {/* Sidebar */}
          <Box sx={{ 
            width: 280, 
            bgcolor: sidebarBg, 
            borderRight: 1, 
            borderColor: 'divider', 
            minHeight: 'calc(100vh - 64px)',
            position: 'sticky',
            top: 64,
            height: 'calc(100vh - 64px)',
            overflow: 'auto'
          }}>
            <Box sx={{ p: 2 }}>
              <Button 
                fullWidth 
                variant="contained" 
                onClick={() => openEdit()}
                sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#E55A00' } }}
                startIcon={<AddIcon />}
              >
                Nueva Carrera
              </Button>
            </Box>
            <Box>
              {races.map(race => (
                <Box
                  key={race.id}
                  onClick={() => setSelectedRace(race)}
                  sx={{ 
                    p: 2, 
                    cursor: 'pointer',
                    bgcolor: selectedRace?.id === race.id ? 'action.selected' : 'transparent',
                    borderBottom: 1,
                    borderColor: 'divider',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                >
                  <Typography sx={{ color: textColor, fontWeight: 500 }}>{race.name}</Typography>
                  <Typography variant="body2" sx={{ color: secondaryTextColor }}>{formatDate(race.date)}</Typography>
                  <Chip 
                    size="small" 
                    label={race.status === 'active' ? 'Activa' : race.status} 
                    sx={{ mt: 1, bgcolor: race.status === 'active' ? 'success.main' : 'grey.500', color: 'white' }}
                  />
                </Box>
              ))}
            </Box>
          </Box>

          {/* Main Content */}
          <Box sx={{ flex: 1, p: 4, bgcolor: mainBg }}>
            {!selectedRace ? (
              <Typography color="text.secondary" variant="h5" sx={{ color: secondaryTextColor }}>Selecciona una carrera para gestionar</Typography>
            ) : (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="h5" fontWeight="bold" sx={{ color: textColor }}>{selectedRace.name}</Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {selectedRace.status === 'upcoming' && (
                      <Button 
                        variant="contained" 
                        onClick={handleStartRace}
                        sx={{ bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' } }}
                        startIcon={<PlayArrowIcon />}
                      >
                        Iniciar
                      </Button>
                    )}
                    <Button variant="outlined" onClick={() => openEdit(selectedRace)} startIcon={<EditIcon />}>Editar</Button>
                    <Button variant="outlined" color="error" onClick={() => handleDeleteRace(selectedRace.id)} startIcon={<DeleteIcon />}></Button>
                  </Box>
                </Box>

                <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
                  <Tab label="Participantes" />
                  <Tab label="Códigos" />
                </Tabs>

                {tab === 0 && (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                      <Button variant="outlined" onClick={exportCSV} startIcon={<DownloadIcon />}>
                        Exportar CSV
                      </Button>
                    </Box>
                    <TableContainer component={Paper} sx={{ bgcolor: sidebarBg }}>
                      <Table>
                        <TableHead sx={{ bgcolor: 'action.hover' }}>
                          <TableRow>
                            <TableCell sx={{ color: secondaryTextColor }}>Nombre</TableCell>
                            <TableCell sx={{ color: secondaryTextColor }}>Email</TableCell>
                            <TableCell sx={{ color: secondaryTextColor }}>Teléfono</TableCell>
                            <TableCell sx={{ color: secondaryTextColor }}>Talla</TableCell>
                            <TableCell sx={{ color: secondaryTextColor }}>Estado</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {participants.map(p => (
                            <TableRow key={p.id}>
                              <TableCell sx={{ color: textColor }}>{p.firstName} {p.lastName}</TableCell>
                              <TableCell sx={{ color: textColor }}>{p.email}</TableCell>
                              <TableCell sx={{ color: textColor }}>{p.phone || '-'}</TableCell>
                              <TableCell sx={{ color: textColor }}>{p.size || '-'}</TableCell>
                              <TableCell>
                                <Chip 
                                  size="small" 
                                  label={p.paymentStatus === 'paid' ? 'Pagado' : 'Pendiente'}
                                  sx={{ bgcolor: p.paymentStatus === 'paid' ? 'success.main' : 'warning.main', color: 'white' }}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                          {participants.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4, color: secondaryTextColor }}>Sin participantes</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </>
                )}

                {tab === 1 && (
                  <Box>
                    <Button 
                      variant="contained" 
                      onClick={() => setOpenCodesDialog(true)}
                      sx={{ mb: 2, bgcolor: ACCENT, '&:hover': { bgcolor: '#E55A00' } }}
                      startIcon={<VpnKeyIcon />}
                    >
                      Generar Códigos
                    </Button>
                    <TableContainer component={Paper} sx={{ bgcolor: sidebarBg }}>
                      <Table>
                        <TableHead sx={{ bgcolor: 'action.hover' }}>
                          <TableRow>
                            <TableCell sx={{ color: secondaryTextColor }}>Código</TableCell>
                            <TableCell sx={{ color: secondaryTextColor }}>Estado</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {codes.map(c => (
                            <TableRow key={c.id}>
                              <TableCell sx={{ color: textColor, fontFamily: 'monospace' }}>{c.code}</TableCell>
                              <TableCell>
                                <Chip 
                                  size="small" 
                                  label={c.used ? 'Usado' : 'Disponible'}
                                  sx={{ bgcolor: c.used ? 'grey.500' : 'success.main', color: 'white' }}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                          {codes.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={2} sx={{ textAlign: 'center', py: 4, color: secondaryTextColor }}>Sin códigos</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}
              </>
            )}
          </Box>
        </Box>

        {/* Race Dialog */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: sidebarBg } }}>
          <DialogTitle sx={{ color: textColor }}>{editRace ? 'Editar Carrera' : 'Nueva Carrera'}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField label="Nombre" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} fullWidth InputProps={{ sx: { color: textColor } }} />
            <TextField label="Descripción" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} multiline rows={2} fullWidth InputProps={{ sx: { color: textColor } }} />
            <TextField label="Fecha" type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} InputLabelProps={{ shrink: true }} fullWidth InputProps={{ sx: { color: textColor } }} />
            <TextField label="Ubicación" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} fullWidth InputProps={{ sx: { color: textColor } }} />
            <TextField label="Precio ($)" type="number" value={formData.price} onChange={(e) => setFormData({...formData, price: parseInt(e.target.value) || 0})} fullWidth InputProps={{ sx: { color: textColor } }} />
            <TextField label="Cupo Máximo" type="number" value={formData.maxParticipants} onChange={(e) => setFormData({...formData, maxParticipants: e.target.value})} fullWidth InputProps={{ sx: { color: textColor } }} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)} sx={{ color: textColor }}>Cancelar</Button>
            <Button variant="contained" onClick={handleSaveRace} sx={{ bgcolor: ACCENT }}>Guardar</Button>
          </DialogActions>
        </Dialog>

        {/* Codes Dialog */}
        <Dialog open={openCodesDialog} onClose={() => setOpenCodesDialog(false)} PaperProps={{ sx: { bgcolor: sidebarBg } }}>
          <DialogTitle sx={{ color: textColor }}>Generar Códigos</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <TextField label="Cantidad" type="number" value={codesCount} onChange={(e) => setCodesCount(parseInt(e.target.value) || 10)} fullWidth InputProps={{ sx: { color: textColor } }} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenCodesDialog(false)} sx={{ color: textColor }}>Cancelar</Button>
            <Button variant="contained" onClick={handleGenerateCodes} sx={{ bgcolor: ACCENT }}>Generar</Button>
          </DialogActions>
        </Dialog>

        {/* Notification */}
        <Snackbar open={!!notification} autoHideDuration={4000} onClose={() => setNotification(null)}>
          {notification && (
            <Alert severity={notification.type} sx={{ width: '100%' }}>
              {notification.message}
            </Alert>
          )}
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}
