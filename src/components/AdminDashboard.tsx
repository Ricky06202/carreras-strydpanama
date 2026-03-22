'use client';

import { useState, useEffect } from 'react';
import {
  Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Box, Typography, Chip, Tabs, Tab, IconButton, Snackbar, Alert,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';

const ACCENT = '#FF6B00';

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

  useEffect(() => {
    fetch('/api/races').then(r => r.json()).then(d => setRaces(d.races || [])).catch(() => {});
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

  return (
    <Box sx={{ minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }} className="fixed top-0 left-0 right-0 z-50 shadow-md">
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <a href="/" style={{ color: ACCENT, textDecoration: 'none', fontSize: '1.25rem', fontWeight: 'bold' }}>← Volver</a>
            <Typography variant="h6" sx={{ color: ACCENT, fontWeight: 'bold' }}>Stryd Panama Admin</Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', pt: 8 }}>
        {/* Sidebar */}
        <Box sx={{ width: 256, bgcolor: 'background.paper', borderRight: 1, borderColor: 'divider' }} className="fixed left-0 top-16 bottom-0 overflow-y-auto">
          <Box sx={{ p: 2 }}>
            <Button 
              fullWidth 
              variant="contained" 
              onClick={() => openEdit()}
              sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#E55A00' } }}
            >
              + Nueva Carrera
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
                  bgcolor: selectedRace?.id === race.id ? 'action.hover' : 'transparent',
                  borderBottom: 1,
                  borderColor: 'divider',
                  '&:hover': { bgcolor: 'action.hover' }
                }}
              >
                <Typography fontWeight={500}>{race.name}</Typography>
                <Typography variant="body2" color="text.secondary">{formatDate(race.date)}</Typography>
                <Chip 
                  size="small" 
                  label={race.status === 'active' ? 'Activa' : race.status} 
                  sx={{ mt: 1, bgcolor: race.status === 'active' ? 'success.main' : 'grey.500' }}
                />
              </Box>
            ))}
          </Box>
        </Box>

        {/* Main Content */}
        <Box sx={{ flex: 1, ml: 32, p: 4 }}>
          {!selectedRace ? (
            <Typography color="text.secondary">Selecciona una carrera para gestionar</Typography>
          ) : (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h5" fontWeight="bold">{selectedRace.name}</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {selectedRace.status === 'upcoming' && (
                    <Button 
                      variant="contained" 
                      onClick={handleStartRace}
                      startIcon="▶"
                      sx={{ bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' } }}
                    >
                      Iniciar
                    </Button>
                  )}
                  <Button 
                    variant="outlined" 
                    onClick={() => openEdit(selectedRace)}
                    startIcon="✏️"
                  >
                    Editar
                  </Button>
                  <Button 
                    variant="outlined" 
                    color="error"
                    onClick={() => handleDeleteRace(selectedRace.id)}
                    startIcon="🗑️"
                  >
                    Eliminar
                  </Button>
                </Box>
              </Box>

              <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
                <Tab label="Participantes" />
                <Tab label="Códigos" />
              </Tabs>

              {tab === 0 && (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                    <Button 
                      variant="outlined" 
                      onClick={exportCSV}
                      startIcon="↓"
                    >
                      Exportar CSV
                    </Button>
                  </Box>
                  <TableContainer component={Paper} elevation={2}>
                    <Table>
                      <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                          <TableCell>Nombre</TableCell>
                          <TableCell>Email</TableCell>
                          <TableCell>Teléfono</TableCell>
                          <TableCell>Talla</TableCell>
                          <TableCell>Estado</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {participants.map(p => (
                          <TableRow key={p.id} sx={{ '&:last-child td': { border: 0 } }}>
                            <TableCell>{p.firstName} {p.lastName}</TableCell>
                            <TableCell>{p.email}</TableCell>
                            <TableCell>{p.phone || '-'}</TableCell>
                            <TableCell>{p.size || '-'}</TableCell>
                            <TableCell>
                              <Chip 
                                size="small" 
                                label={p.paymentStatus === 'paid' ? 'Pagado' : 'Pendiente'}
                                sx={{ bgcolor: p.paymentStatus === 'paid' ? 'success.main' : 'warning.main' }}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                        {participants.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4 }}>Sin participantes</TableCell>
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
                  >
                    + Generar Códigos
                  </Button>
                  <TableContainer component={Paper} elevation={2}>
                    <Table>
                      <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                          <TableCell>Código</TableCell>
                          <TableCell>Usado</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {codes.map(c => (
                          <TableRow key={c.id} sx={{ '&:last-child td': { border: 0 } }}>
                            <TableCell sx={{ fontFamily: 'monospace' }}>{c.code}</TableCell>
                            <TableCell>
                              <Chip 
                                size="small" 
                                label={c.used ? 'Usado' : 'Disponible'}
                                sx={{ bgcolor: c.used ? 'grey.500' : 'success.main' }}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                        {codes.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={2} sx={{ textAlign: 'center', py: 4 }}>Sin códigos</TableCell>
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
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editRace ? 'Editar Carrera' : 'Nueva Carrera'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="Nombre"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            fullWidth
          />
          <TextField
            label="Descripción"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            multiline
            rows={2}
            fullWidth
          />
          <TextField
            label="Fecha"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({...formData, date: e.target.value})}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label="Ubicación"
            value={formData.location}
            onChange={(e) => setFormData({...formData, location: e.target.value})}
            fullWidth
          />
          <TextField
            label="Precio ($)"
            type="number"
            value={formData.price}
            onChange={(e) => setFormData({...formData, price: parseInt(e.target.value) || 0})}
            fullWidth
          />
          <TextField
            label="Cupo Máximo"
            type="number"
            value={formData.maxParticipants}
            onChange={(e) => setFormData({...formData, maxParticipants: e.target.value})}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button 
            variant="contained" 
            onClick={handleSaveRace}
            sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#E55A00' } }}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Codes Dialog */}
      <Dialog open={openCodesDialog} onClose={() => setOpenCodesDialog(false)}>
        <DialogTitle>Generar Códigos</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            label="Cantidad"
            type="number"
            value={codesCount}
            onChange={(e) => setCodesCount(parseInt(e.target.value) || 10)}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCodesDialog(false)}>Cancelar</Button>
          <Button 
            variant="contained" 
            onClick={handleGenerateCodes}
            sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#E55A00' } }}
          >
            Generar
          </Button>
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
  );
}
