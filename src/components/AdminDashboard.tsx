'use client';

import { useState, useEffect } from 'react';
import { ThemeProvider, createTheme, CssBaseline, Box, AppBar, Toolbar, Typography, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Container, Grid, Paper, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, IconButton, Alert, Snackbar, Tab, Tabs } from '@mui/material';
import { SaveAlt, Add, PlayArrow, Delete, Edit } from '@mui/icons-material';

const theme = createTheme({
  palette: {
    primary: { main: '#FF6B00' },
    secondary: { main: '#FF8C33' },
    mode: 'light',
  },
});

interface Race {
  id: string;
  name: string;
  description: string;
  date: string;
  status: string;
  location: string;
  price: number;
  maxParticipants: number;
  startTimestamp: number;
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
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [formData, setFormData] = useState({ name: '', description: '', date: '', location: '', price: 0, maxParticipants: '' });

  const fetchRaces = () => {
    fetch('/api/races').then(r => r.json()).then(d => setRaces(d.races || [])).catch(() => {});
  };

  const fetchRaceDetails = (id: string) => {
    fetch(`/api/admin/race/${id}`).then(r => r.json()).then(d => {
      setSelectedRace(d.race);
      setParticipants(d.participants || []);
      setCodes(d.codes || []);
    }).catch(() => {});
  };

  useEffect(() => { fetchRaces(); }, []);

  useEffect(() => {
    if (selectedRace) fetchRaceDetails(selectedRace.id);
  }, [selectedRace]);

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
      setSnackbar({ open: true, message: editRace ? 'Carrera actualizada' : 'Carrera creada', severity: 'success' });
      setOpenDialog(false);
      fetchRaces();
    } else {
      setSnackbar({ open: true, message: data.message, severity: 'error' });
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
      setSnackbar({ open: true, message: '¡Carrera iniciada!', severity: 'success' });
      fetchRaceDetails(selectedRace.id);
      fetchRaces();
    } else {
      setSnackbar({ open: true, message: data.message, severity: 'error' });
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
      setSnackbar({ open: true, message: `${data.codes.length} códigos generados`, severity: 'success' });
      setOpenCodesDialog(false);
      fetchRaceDetails(selectedRace.id);
    } else {
      setSnackbar({ open: true, message: data.message, severity: 'error' });
    }
  };

  const handleDeleteRace = async (id: string) => {
    if (!confirm('¿Eliminar esta carrera?')) return;
    const res = await fetch(`/api/admin/race/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setSnackbar({ open: true, message: 'Carrera eliminada', severity: 'success' });
      if (selectedRace?.id === id) setSelectedRace(null);
      fetchRaces();
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
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex' }}>
        <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
          <Toolbar>
            <Typography variant="h6" noWrap>Stryd Panama Admin</Typography>
          </Toolbar>
        </AppBar>
        <Drawer variant="permanent" sx={{ width: 280, flexShrink: 0, '& .MuiDrawer-paper': { width: 280, boxSizing: 'border-box' } }}>
          <Toolbar />
          <Box sx={{ p: 2 }}>
            <Button variant="contained" fullWidth startIcon={<Add />} onClick={() => openEdit()}>Nueva Carrera</Button>
          </Box>
          <List>
            {races.map(race => (
              <ListItem key={race.id} disablePadding>
                <ListItemButton selected={selectedRace?.id === race.id} onClick={() => setSelectedRace(race)}>
                  <ListItemText primary={race.name} secondary={formatDate(race.date)} />
                  <Chip label={race.status === 'active' ? 'Activa' : race.status} size="small" color={race.status === 'active' ? 'success' : 'default'} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Drawer>
        <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
          <Toolbar />
          {!selectedRace ? (
            <Typography color="text.secondary">Selecciona una carrera para gestionar</Typography>
          ) : (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h5">{selectedRace.name}</Typography>
                <Box>
                  {selectedRace.status === 'upcoming' && (
                    <Button variant="contained" color="success" startIcon={<PlayArrow />} onClick={handleStartRace} sx={{ mr: 1 }}>Iniciar Carrera</Button>
                  )}
                  <Button variant="outlined" startIcon={<Edit />} onClick={() => openEdit(selectedRace)} sx={{ mr: 1 }}>Editar</Button>
                  <Button variant="outlined" color="error" startIcon={<Delete />} onClick={() => handleDeleteRace(selectedRace.id)}>Eliminar</Button>
                </Box>
              </Box>
              <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
                <Tab label="Participantes" />
                <Tab label="Códigos" />
              </Tabs>
              {tab === 0 && (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                    <Button startIcon={<SaveAlt />} onClick={exportCSV}>Exportar CSV</Button>
                  </Box>
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
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
                          <TableRow key={p.id}>
                            <TableCell>{p.firstName} {p.lastName}</TableCell>
                            <TableCell>{p.email}</TableCell>
                            <TableCell>{p.phone || '-'}</TableCell>
                            <TableCell>{p.size || '-'}</TableCell>
                            <TableCell>
                              <Chip label={p.paymentStatus === 'paid' ? 'Pagado' : 'Pendiente'} color={p.paymentStatus === 'paid' ? 'success' : 'warning'} size="small" />
                            </TableCell>
                          </TableRow>
                        ))}
                        {participants.length === 0 && <TableRow><TableCell colSpan={5} align="center">Sin participantes</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
              {tab === 1 && (
                <Box>
                  <Button variant="contained" startIcon={<Add />} onClick={() => setOpenCodesDialog(true)} sx={{ mb: 2 }}>Generar Códigos</Button>
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Código</TableCell>
                          <TableCell>Usado</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {codes.map(c => (
                          <TableRow key={c.id}>
                            <TableCell sx={{ fontFamily: 'monospace' }}>{c.code}</TableCell>
                            <TableCell><Chip label={c.used ? 'Usado' : 'Disponible'} color={c.used ? 'default' : 'success'} size="small" /></TableCell>
                          </TableRow>
                        ))}
                        {codes.length === 0 && <TableRow><TableCell colSpan={2} align="center">Sin códigos</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </>
          )}
        </Box>
      </Box>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editRace ? 'Editar Carrera' : 'Nueva Carrera'}</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Nombre" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} margin="normal" />
          <TextField fullWidth label="Descripción" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} margin="normal" multiline rows={2} />
          <TextField fullWidth label="Fecha" type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} margin="normal" InputLabelProps={{ shrink: true }} />
          <TextField fullWidth label="Ubicación" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} margin="normal" />
          <TextField fullWidth label="Precio ($)" type="number" value={formData.price} onChange={e => setFormData({...formData, price: parseInt(e.target.value) || 0})} margin="normal" />
          <TextField fullWidth label="Cupo Máximo" type="number" value={formData.maxParticipants} onChange={e => setFormData({...formData, maxParticipants: e.target.value})} margin="normal" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveRace}>Guardar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openCodesDialog} onClose={() => setOpenCodesDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Generar Códigos</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Cantidad" type="number" value={codesCount} onChange={e => setCodesCount(parseInt(e.target.value) || 10)} margin="normal" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCodesDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleGenerateCodes}>Generar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </ThemeProvider>
  );
}