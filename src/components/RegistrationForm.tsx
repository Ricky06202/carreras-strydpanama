'use client';

import { useState, useEffect } from 'react';
import { 
  TextField, Button, Select, MenuItem, FormControl, InputLabel, 
  Box, Typography, Stepper, Step, StepLabel, Alert, Paper, Snackbar,
  ThemeProvider, createTheme, CssBaseline
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

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
  price: number;
}

const steps = ['Carrera', 'Datos', 'Confirmación'];
const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export default function RegistrationForm({ raceId }: { raceId: string }) {
  const [step, setStep] = useState(0);
  const [races, setRaces] = useState<Race[]>([]);
  const [selectedRace, setSelectedRace] = useState(raceId);
  const [code, setCode] = useState('');
  const [codeValid, setCodeValid] = useState<{ valid: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'light' | 'dark'>(getInitialTheme);

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    birthDate: '', gender: '', size: ''
  });
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const handleThemeChange = (e: CustomEvent<{ mode: 'light' | 'dark' }>) => {
      setMode(e.detail.mode);
    };
    window.addEventListener('themechange', handleThemeChange as EventListener);
    return () => window.removeEventListener('themechange', handleThemeChange as EventListener);
  }, []);

  useEffect(() => {
    fetch('/api/races').then(r => r.json()).then(d => setRaces(d.races || [])).catch(() => {});
  }, []);

  const validateCode = async () => {
    if (!code.trim()) {
      setCodeValid({ valid: false, message: 'Ingrese un código' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/validate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, raceId: selectedRace })
      });
      const data = await res.json();
      setCodeValid(data.valid ? { valid: true, message: 'Código válido' } : { valid: false, message: data.message || 'Código inválido' });
    } catch {
      setCodeValid({ valid: false, message: 'Error al validar código' });
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, code, raceId: selectedRace })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al registrar');
      setNotification({ message: 'Registro exitoso', type: 'success' });
      setStep(2);
    } catch (e: any) {
      setNotification({ message: e.message, type: 'error' });
    }
    setLoading(false);
  };

  return (
    <ThemeProvider theme={mode === 'dark' ? darkTheme : lightTheme}>
      <CssBaseline />
      <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
        <Stepper activeStep={step} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {step === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Carrera *</InputLabel>
              <Select
                value={selectedRace}
                label="Carrera *"
                onChange={(e) => setSelectedRace(e.target.value)}
              >
                {races.map((r) => (
                  <MenuItem key={r.id} value={r.id}>
                    {r.name} - ${r.price}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                fullWidth
                label="Código de descuento (opcional)"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <Button 
                variant="outlined" 
                onClick={validateCode} 
                disabled={loading}
                sx={{ borderColor: ACCENT, color: ACCENT, '&:hover': { borderColor: ACCENT, backgroundColor: 'rgba(255,107,0,0.08)' } }}
              >
                Validar
              </Button>
            </Box>
            
            {codeValid && (
              <Typography color={codeValid.valid ? 'success.main' : 'error.main'} variant="body2">
                {codeValid.message}
              </Typography>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="contained"
                onClick={() => setStep(1)}
                disabled={!selectedRace}
                endIcon={<NavigateNextIcon />}
                sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#E55A00' } }}
              >
                Continuar
              </Button>
            </Box>
          </Box>
        )}

        {step === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                label="Nombre *"
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                required
              />
              <TextField
                label="Apellido *"
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                required
              />
              <TextField
                label="Email *"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
              <TextField
                label="Teléfono"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
              <TextField
                label="Fecha de Nacimiento"
                type="date"
                value={formData.birthDate}
                onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
                InputLabelProps={{ shrink: true }}
              />
              <FormControl>
                <InputLabel>Género</InputLabel>
                <Select
                  value={formData.gender}
                  label="Género"
                  onChange={(e) => setFormData({...formData, gender: e.target.value})}
                >
                  <MenuItem value="M">Masculino</MenuItem>
                  <MenuItem value="F">Femenino</MenuItem>
                  <MenuItem value="O">Otro</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <FormControl fullWidth>
              <InputLabel>Talla de Camiseta</InputLabel>
              <Select
                value={formData.size}
                label="Talla de Camiseta"
                onChange={(e) => setFormData({...formData, size: e.target.value})}
              >
                {sizes.map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
              <Button variant="outlined" onClick={() => setStep(0)} startIcon={<ArrowBackIcon />}>
                Atrás
              </Button>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={loading || !formData.firstName || !formData.lastName || !formData.email}
                sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#E55A00' } }}
              >
                {loading ? 'Procesando...' : 'Confirmar Inscripción'}
              </Button>
            </Box>
          </Box>
        )}

        {step === 2 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
            <Typography variant="h4" sx={{ mb: 2, color: 'success.main' }}>
              ¡Inscripción Exitosa!
            </Typography>
            <Typography color="text.secondary">
              Te hemos enviado un correo de confirmación.
            </Typography>
          </Box>
        )}

        <Snackbar open={!!notification} autoHideDuration={4000} onClose={() => setNotification(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Box>
            {notification && (
              <Alert severity={notification.type} sx={{ width: '100%' }}>
                {notification.message}
              </Alert>
            )}
          </Box>
        </Snackbar>
      </Paper>
    </ThemeProvider>
  );
}
