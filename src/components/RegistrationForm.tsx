'use client';

import { useState, useEffect } from 'react';
import { 
  TextField, Button, Box, Typography, Alert, Paper, 
  Stepper, Step, StepLabel, MenuItem, Select, FormControl, 
  InputLabel, CircularProgress 
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

function getThemeMode(): 'light' | 'dark' {
  if (typeof window !== 'undefined') {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 
           (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }
  return 'light';
}

interface Race {
  id: string;
  name: string;
  price: number;
}

export default function RegistrationForm({ raceId }: { raceId: string }) {
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const [step, setStep] = useState(0);
  const [races, setRaces] = useState<Race[]>([]);
  const [selectedRace, setSelectedRace] = useState(raceId);
  const [code, setCode] = useState('');
  const [codeValid, setCodeValid] = useState<{ valid: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    birthDate: '', gender: '', size: ''
  });

  useEffect(() => {
    const theme = getThemeMode();
    setMode(theme);
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
    setError('');
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, code, raceId: selectedRace })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al registrar');
      setSuccess(data.paymentUrl || 'Registro exitoso');
      setStep(2);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

  return (
    <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
      <Stepper activeStep={step} sx={{ mb: 4 }}>
        <Step><StepLabel>Carrera</StepLabel></Step>
        <Step><StepLabel>Datos</StepLabel></Step>
        <Step><StepLabel>Confirmación</StepLabel></Step>
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} icon={<ErrorIcon />}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircleIcon />}>
          {success}
        </Alert>
      )}

      {step === 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <FormControl fullWidth>
            <InputLabel>Seleccionar Carrera</InputLabel>
            <Select
              value={selectedRace}
              label="Seleccionar Carrera"
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
              label="Código de Descuento (opcional)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <Button 
              variant="outlined" 
              onClick={validateCode}
              disabled={loading}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Validar
            </Button>
          </Box>
          
          {codeValid && (
            <Alert severity={codeValid.valid ? 'success' : 'error'}>
              {codeValid.message}
            </Alert>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button 
              variant="contained" 
              onClick={() => setStep(1)}
              disabled={!selectedRace}
            >
              Continuar
            </Button>
          </Box>
        </Box>
      )}

      {step === 1 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2.5 }}>
            <TextField
              fullWidth
              label="Nombre"
              value={formData.firstName}
              onChange={(e) => setFormData({...formData, firstName: e.target.value})}
              required
            />
            <TextField
              fullWidth
              label="Apellido"
              value={formData.lastName}
              onChange={(e) => setFormData({...formData, lastName: e.target.value})}
              required
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
            <TextField
              fullWidth
              label="Teléfono"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />
            <TextField
              fullWidth
              label="Fecha de Nacimiento"
              type="date"
              value={formData.birthDate}
              onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
              InputLabelProps={{ shrink: true }}
            />
            <FormControl fullWidth>
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
            <FormControl fullWidth sx={{ gridColumn: '1 / -1' }}>
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

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
            <Button onClick={() => setStep(0)}>Atrás</Button>
            <Button 
              variant="contained" 
              onClick={handleSubmit}
              disabled={loading || !formData.firstName || !formData.lastName || !formData.email}
            >
              {loading ? <CircularProgress size={24} /> : 'Confirmar Inscripción'}
            </Button>
          </Box>
        </Box>
      )}

      {step === 2 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            ¡Inscripción Exitosa!
          </Typography>
          <Typography color="text.secondary">
            Te hemos enviado un correo de confirmación.
          </Typography>
        </Box>
      )}
    </Paper>
  );
}