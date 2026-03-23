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

interface Category {
  id: string;
  name: string;
  description: string | null;
  priceAdjustment: number;
  maxParticipants: number | null;
}

const steps = ['Carrera', 'Datos', 'Método de Pago', 'Confirmación'];
const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const paymentMethods = [
  { value: 'yappy', label: 'Yappy' },
  { value: 'transfer', label: 'Transferencia Bancaria' },
  { value: 'card', label: 'Tarjeta de Crédito/Débito' },
  { value: 'cash', label: 'Efectivo en persona' },
];

export default function RegistrationForm({ raceId }: { raceId: string }) {
  const [step, setStep] = useState(0);
  const [races, setRaces] = useState<Race[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedRace, setSelectedRace] = useState(raceId);
  const [code, setCode] = useState('');
  const [codeValid, setCodeValid] = useState<{ valid: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'light' | 'dark'>(getInitialTheme);

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    birthDate: '', gender: '', category: '', team: '', size: '', paymentMethod: ''
  });
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const loadCategories = (raceId: string) => {
    if (raceId) {
      fetch(`/api/categories/${raceId}`).then(r => r.json()).then(d => setCategories(d.categories || [])).catch(() => {});
    }
  };

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

  useEffect(() => {
    if (selectedRace) {
      loadCategories(selectedRace);
      setFormData(prev => ({ ...prev, category: '' }));
    }
  }, [selectedRace]);

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
        body: JSON.stringify({ 
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          birthDate: formData.birthDate,
          gender: formData.gender,
          categoryId: formData.category,
          team: formData.team,
          size: formData.size,
          paymentMethod: formData.paymentMethod,
          code, 
          raceId: selectedRace 
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al registrar');
      setNotification({ message: 'Registro exitoso', type: 'success' });
      setStep(3);
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
                InputProps={{ sx: { '& input[type=date]::-webkit-calendar-picker-indicator': { filter: mode === 'dark' ? 'invert(1)' : 'none' } } }}
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
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Categoría *</InputLabel>
                <Select
                  value={formData.category}
                  label="Categoría *"
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                >
                  {categories.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name} {c.priceAdjustment !== 0 && `(${c.priceAdjustment > 0 ? '+' : ''}$${c.priceAdjustment})`}
                    </MenuItem>
                  ))}
                  {categories.length === 0 && (
                    <MenuItem disabled value="">Sin categorías disponibles</MenuItem>
                  )}
                </Select>
              </FormControl>
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
            </Box>

            <TextField
              label="Equipo (opcional)"
              value={formData.team}
              onChange={(e) => setFormData({...formData, team: e.target.value})}
              placeholder="Ej: Team Stryd, Corredores Panamá, etc."
              fullWidth
            />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
              <Button variant="outlined" onClick={() => setStep(0)} startIcon={<ArrowBackIcon />}>
                Atrás
              </Button>
              <Button
                variant="contained"
                onClick={() => setStep(2)}
                disabled={!formData.firstName || !formData.lastName || !formData.email || !formData.category}
                endIcon={<NavigateNextIcon />}
                sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#E55A00' } }}
              >
                Continuar
              </Button>
            </Box>
          </Box>
        )}

        {step === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Selecciona tu método de pago</Typography>
            
            <FormControl fullWidth>
              <InputLabel>Método de Pago *</InputLabel>
              <Select
                value={formData.paymentMethod}
                label="Método de Pago *"
                onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
              >
                {paymentMethods.map((pm) => (
                  <MenuItem key={pm.value} value={pm.value}>{pm.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 2, mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {formData.paymentMethod === 'yappy' && 'Recibirás un enlace de pago por Yappy al confirmar.'}
                {formData.paymentMethod === 'transfer' && 'Los datos de transferencia se mostrarán al finalizar.'}
                {formData.paymentMethod === 'card' && 'Serás redirigido a la pasarela de pago segura.'}
                {formData.paymentMethod === 'cash' && 'Deberás acercar a nuestras oficinas para completar el pago.'}
                {!formData.paymentMethod && 'Selecciona un método de pago para continuar.'}
              </Typography>
            </Box>

            <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 2, border: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Resumen:</Typography>
              <Typography variant="body2">
                Carrera: {races.find(r => r.id === selectedRace)?.name || '-'}
              </Typography>
              <Typography variant="body2">
                Participante: {formData.firstName} {formData.lastName}
              </Typography>
              <Typography variant="body2" fontWeight="bold" sx={{ mt: 1 }}>
                Total: ${races.find(r => r.id === selectedRace)?.price || 0}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
              <Button variant="outlined" onClick={() => setStep(1)} startIcon={<ArrowBackIcon />}>
                Atrás
              </Button>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={loading || !formData.paymentMethod}
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
