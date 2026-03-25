'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Snackbar, Alert, Typography, ThemeProvider, createTheme, CssBaseline, Box, CardMedia } from '@mui/material';
import AdminLayout from './AdminLayout';
import AdminContent from './AdminContent';

const ACCENT = '#FF6B00';

function getInitialTheme(): 'light' | 'dark' {
  if (typeof document !== 'undefined') {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return 'dark';
  }
  return 'dark';
}

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: ACCENT },
    background: {
      default: '#111827',
      paper: '#1F2937',
    },
  },
});

const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: ACCENT },
    background: {
      default: '#F9FAFB',
      paper: '#FFFFFF',
    },
  },
});

interface Race {
  id: string;
  name: string;
  description: string | null;
  date: string;
  status: string;
  location: string | null;
  price: number;
  maxParticipants: number | null;
  imageUrl: string | null;
  technicalInfo: string | null;
  termsAndConditions: string | null;
  timerStart: number | null;
  timerStop: number | null;
}

interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  paymentStatus: string;
  size: string;
  categoryId: string | null;
  distanceId: string | null;
  team: string | null;
  termsAccepted: boolean;
}

interface Category {
  id: string;
  name: string;
}

interface Distance {
  id: string;
  name: string;
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [distances, setDistances] = useState<Distance[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editRace, setEditRace] = useState<Race | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', date: '', location: '', price: 0, maxParticipants: '', imageUrl: '', technicalInfo: '', termsAndConditions: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; raceId: string | null }>({ open: false, raceId: null });
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [mode, setMode] = useState<'light' | 'dark'>(getInitialTheme);
  const [uploadingImage, setUploadingImage] = useState(false);

  const loadCategories = (raceId: string) => {
    fetch(`/api/categories/${raceId}`)
      .then(r => {
        if (!r.ok) return r.json().then(e => Promise.reject(e));
        return r.json();
      })
      .then(d => {
        if (d.categories) {
          setCategories(d.categories);
        }
      })
      .catch(() => {});
  };

  const loadDistances = (raceId: string) => {
    fetch(`/api/admin/distances?raceId=${raceId}`)
      .then(r => {
        if (!r.ok) return r.json().then(e => Promise.reject(e));
        return r.json();
      })
      .then(d => {
        if (d.distances) {
          setDistances(d.distances);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.mode) {
        setMode(detail.mode);
      }
    };
    window.addEventListener('themechange', handleThemeChange);
    return () => window.removeEventListener('themechange', handleThemeChange);
  }, []);

  useEffect(() => {
    fetch('/api/admin/races')
      .then(r => {
        if (!r.ok) return r.json().then(e => Promise.reject(e));
        return r.json();
      })
      .then(d => {
        if (d.races) {
          setRaces(d.races);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedRace) {
      fetch(`/api/admin/race/${selectedRace.id}`)
        .then(r => {
          if (!r.ok) return r.json().then(e => Promise.reject(e));
          return r.json();
        })
        .then(d => {
          if (d.race) {
            setSelectedRace(d.race);
            setParticipants(d.participants || []);
            setCodes(d.codes || []);
          }
        })
        .catch(() => {});
      loadCategories(selectedRace.id);
      loadDistances(selectedRace.id);
    }
  }, [selectedRace?.id]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/admin/upload-image', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (res.ok && data.url) {
        setFormData(prev => ({ ...prev, imageUrl: data.url }));
        setNotification({ message: 'Imagen subida correctamente', type: 'success' });
      } else {
        setNotification({ message: data.error || 'Error al subir imagen', type: 'error' });
      }
    } catch {
      setNotification({ message: 'Error al subir imagen', type: 'error' });
    }
    setUploadingImage(false);
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
      setOpenDialog(false);
      fetch('/api/admin/races')
        .then(r => r.json())
        .then(d => { if (d.races) setRaces(d.races); })
        .catch(() => {});
    } else {
      setNotification({ message: data.message || 'Error al guardar carrera', type: 'error' });
    }
  };

  const handleUpdateRaceStatus = async (status: string, extraData?: Record<string, any>) => {
    if (!selectedRace) return;
    const res = await fetch(`/api/admin/race/${selectedRace.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, ...extraData })
    });
    const data = await res.json();
    if (res.ok) {
      if (data.race) setSelectedRace(data.race);
      fetch('/api/admin/races')
        .then(r => r.json())
        .then(d => { if (d.races) setRaces(d.races); })
        .catch(() => {});
    } else {
      setNotification({ message: data.message || 'Error al actualizar carrera', type: 'error' });
    }
  };

  const handleActivateRace = () => handleUpdateRaceStatus('accepting');
  const handleFinishRace = () => handleUpdateRaceStatus('active');
  const handleCompleteRace = () => handleUpdateRaceStatus('finished');
  
  const handleStartTimer = () => {
    handleUpdateRaceStatus(selectedRace?.status || 'active', { timerStart: Math.floor(Date.now() / 1000), timerStop: null });
  };
  
  const handleStopTimer = () => {
    handleUpdateRaceStatus(selectedRace?.status || 'active', { timerStop: Math.floor(Date.now() / 1000) });
  };

  const handleGenerateCodes = async (count: number) => {
    if (!selectedRace) return;
    const res = await fetch('/api/admin/generate-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raceId: selectedRace.id, count })
    });
    if (res.ok) {
      fetch(`/api/admin/race/${selectedRace.id}`)
        .then(r => r.json())
        .then(d => { if (d.codes) setCodes(d.codes); })
        .catch(() => {});
    }
  };

  const handleDeleteRace = async (id: string) => {
    setDeleteConfirm({ open: true, raceId: id });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.raceId) return;
    const res = await fetch(`/api/admin/race/${deleteConfirm.raceId}`, { method: 'DELETE' });
    if (res.ok) {
      setNotification({ message: 'Carrera eliminada', type: 'success' });
      if (selectedRace?.id === deleteConfirm.raceId) setSelectedRace(null);
      fetch('/api/admin/races')
        .then(r => r.json())
        .then(d => { if (d.races) setRaces(d.races); })
        .catch(() => {});
    } else {
      setNotification({ message: 'Error al eliminar carrera', type: 'error' });
    }
    setDeleteConfirm({ open: false, raceId: null });
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
      setFormData({ name: race.name, description: race.description || '', date: race.date, location: race.location || '', price: race.price, maxParticipants: race.maxParticipants?.toString() || '', imageUrl: race.imageUrl || '', technicalInfo: race.technicalInfo || '', termsAndConditions: race.termsAndConditions || '' });
    } else {
      setEditRace(null);
      setFormData({ name: '', description: '', date: '', location: '', price: 0, maxParticipants: '', imageUrl: '', technicalInfo: '', termsAndConditions: '' });
    }
    setOpenDialog(true);
  };

  const handleSelectRace = (race: Race | null) => {
    setSelectedRace(race);
    if (!race) {
      setCategories([]);
      setDistances([]);
    }
  };

  const handleCreateCategory = async (data: Partial<Category>) => {
    if (!selectedRace) return;
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, raceId: selectedRace.id })
    });
    if (res.ok) loadCategories(selectedRace.id);
  };

  const handleUpdateCategory = async (id: string, data: Partial<Category>) => {
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok && selectedRace) loadCategories(selectedRace.id);
  };

  const handleDeleteCategory = async (id: string) => {
    const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
    if (res.ok && selectedRace) loadCategories(selectedRace.id);
  };

  const handleCreateDistance = async (data: Partial<Distance>) => {
    if (!selectedRace) return;
    const res = await fetch('/api/admin/distances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, raceId: selectedRace.id })
    });
    if (res.ok) loadDistances(selectedRace.id);
  };

  const handleUpdateDistance = async (id: string, data: Partial<Distance>) => {
    const res = await fetch(`/api/admin/distances/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok && selectedRace) loadDistances(selectedRace.id);
  };

  const handleDeleteDistance = async (id: string) => {
    const res = await fetch(`/api/admin/distances/${id}`, { method: 'DELETE' });
    if (res.ok && selectedRace) loadDistances(selectedRace.id);
  };

  const handleUpdateParticipant = async (id: string, data: Partial<Participant>) => {
    const res = await fetch(`/api/admin/participant/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok && selectedRace) {
      fetch(`/api/admin/race/${selectedRace.id}`)
        .then(r => r.json())
        .then(d => { if (d.participants) setParticipants(d.participants); })
        .catch(() => {});
    }
  };

  const handleDeleteParticipant = async (id: string) => {
    const res = await fetch(`/api/admin/participant/${id}`, { method: 'DELETE' });
    if (res.ok && selectedRace) {
      fetch(`/api/admin/race/${selectedRace.id}`)
        .then(r => r.json())
        .then(d => { if (d.participants) setParticipants(d.participants); })
        .catch(() => {});
    }
  };

  return (
    <ThemeProvider theme={mode === 'dark' ? darkTheme : lightTheme}>
      <CssBaseline />
      <>
        <AdminLayout
          races={races}
          selectedRaceId={selectedRace?.id || null}
          onSelectRace={handleSelectRace}
          onNewRace={() => openEdit()}
        >
          <AdminContent
            selectedRace={selectedRace}
            participants={participants}
            codes={codes}
            categories={categories}
            distances={distances}
            onActivateRace={handleActivateRace}
            onFinishRace={handleFinishRace}
            onCompleteRace={handleCompleteRace}
            onStartTimer={handleStartTimer}
            onStopTimer={handleStopTimer}
            onEditRace={openEdit}
            onDeleteRace={handleDeleteRace}
            onExportCSV={exportCSV}
            onGenerateCodes={handleGenerateCodes}
            onCreateCategory={handleCreateCategory}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
            onCreateDistance={handleCreateDistance}
            onUpdateDistance={handleUpdateDistance}
            onDeleteDistance={handleDeleteDistance}
            onUpdateParticipant={handleUpdateParticipant}
            onDeleteParticipant={handleDeleteParticipant}
          />
        </AdminLayout>

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>{editRace ? 'Editar Carrera' : 'Nueva Carrera'}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField label="Nombre" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} fullWidth />
            <TextField label="Descripción" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} multiline rows={2} fullWidth />
            <TextField label="Fecha" type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} InputLabelProps={{ shrink: true }} fullWidth InputProps={{ sx: { '& input[type=date]::-webkit-calendar-picker-indicator': { filter: mode === 'dark' ? 'invert(1)' : 'none' } } }} />
            <TextField label="Ubicación" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} fullWidth />
            <TextField label="Precio ($)" type="number" value={formData.price} onChange={(e) => setFormData({...formData, price: parseInt(e.target.value) || 0})} fullWidth />
            <TextField label="Cupo Máximo" type="number" value={formData.maxParticipants} onChange={(e) => setFormData({...formData, maxParticipants: e.target.value})} fullWidth />
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>Imagen de la Carrera</Typography>
              {formData.imageUrl && (
                <Box sx={{ mb: 2, position: 'relative' }}>
                  <CardMedia
                    component="img"
                    image={formData.imageUrl}
                    alt="Preview"
                    sx={{ height: 200, borderRadius: 2, objectFit: 'cover' }}
                  />
                  <Button 
                    size="small" 
                    color="error" 
                    onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                    sx={{ position: 'absolute', top: 8, right: 8 }}
                  >
                    Eliminar
                  </Button>
                </Box>
              )}
              <Button
                variant="outlined"
                component="label"
                disabled={uploadingImage}
                sx={{ borderColor: ACCENT, color: ACCENT }}
              >
                {uploadingImage ? 'Subiendo...' : 'Subir Imagen'}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleImageUpload}
                />
              </Button>
              <TextField 
                label="URL de Imagen (manual)" 
                value={formData.imageUrl} 
                onChange={(e) => setFormData({...formData, imageUrl: e.target.value})} 
                fullWidth 
                size="small"
                sx={{ mt: 1 }}
                placeholder="O pega una URL manualmente"
              />
            </Box>
            <TextField label="Información Técnica" value={formData.technicalInfo} onChange={(e) => setFormData({...formData, technicalInfo: e.target.value})} multiline rows={3} fullWidth placeholder="Detalles técnicos de la carrera..." />
            <TextField label="Términos y Condiciones / Disclaimer" value={formData.termsAndConditions} onChange={(e) => setFormData({...formData, termsAndConditions: e.target.value})} multiline rows={4} fullWidth placeholder="Términos y condiciones y descargos de responsabilidad..." />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
            <Button variant="contained" onClick={handleSaveRace} sx={{ bgcolor: ACCENT }}>Guardar</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={deleteConfirm.open} onClose={() => setDeleteConfirm({ open: false, raceId: null })}>
          <DialogTitle>Confirmar Eliminación</DialogTitle>
          <DialogContent>
            <Typography>¿Estás seguro de que deseas eliminar esta carrera? Esta acción no se puede deshacer.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteConfirm({ open: false, raceId: null })}>Cancelar</Button>
            <Button variant="contained" color="error" onClick={confirmDelete}>Eliminar</Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={!!notification} autoHideDuration={4000} onClose={() => setNotification(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Box>
            {notification && (
              <Alert severity={notification.type} sx={{ width: '100%' }}>
                {notification.message}
              </Alert>
            )}
          </Box>
        </Snackbar>
      </>
    </ThemeProvider>
  );
}
