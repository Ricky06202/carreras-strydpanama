'use client';

import { useState, useEffect } from 'react';
import { TextField, Button, Box, Typography, Alert, Paper, Stepper, Step, StepLabel, MenuItem, CircularProgress } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const theme = createTheme({
  palette: {
    primary: { main: '#FF6B00' },
    secondary: { main: '#FF8C33' },
  },
  typography: { fontFamily: 'system-ui, sans-serif' },
});

interface Race {
  id: string;
  name: string;
  price: number;
}

export default function RegistrationForm({ raceId }: { raceId: string }) {
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
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Paper className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <Stepper activeStep={step} className="mb-6">
          <Step><StepLabel>Seleccionar Carrera</StepLabel></Step>
          <Step><StepLabel>Datos Personales</StepLabel></Step>
          <Step><StepLabel>Confirmación</StepLabel></Step>
        </Stepper>

        {error && <Alert severity="error" className="mb-4">{error}</Alert>}
        {success && <Alert severity="success" className="mb-4">{success}</Alert>}

        {step === 0 && (
          <Box>
            <TextField select fullWidth label="Carrera" value={selectedRace} onChange={e => setSelectedRace(e.target.value)} className="mb-4">
              {races.map(r => <MenuItem key={r.id} value={r.id}>{r.name} - ${r.price}</MenuItem>)}
            </TextField>
            <TextField fullWidth label="Código de Descuento" value={code} onChange={e => setCode(e.target.value)} className="mb-4" />
            {codeValid && (
              <Alert severity={codeValid.valid ? 'success' : 'error'} className="mb-4">{codeValid.message}</Alert>
            )}
            <Button variant="outlined" onClick={validateCode} disabled={loading} className="mb-4">Validar Código</Button>
            <div className="flex justify-end">
              <Button variant="contained" onClick={() => setStep(1)} disabled={!selectedRace}>Continuar</Button>
            </div>
          </Box>
        )}

        {step === 1 && (
          <Box>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField fullWidth label="Nombre" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} required />
              <TextField fullWidth label="Apellido" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} required />
              <TextField fullWidth label="Email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
              <TextField fullWidth label="Teléfono" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              <TextField fullWidth label="Fecha de Nacimiento" type="date" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} InputLabelProps={{ shrink: true }} />
              <TextField select fullWidth label="Género" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                <MenuItem value="M">Masculino</MenuItem>
                <MenuItem value="F">Femenino</MenuItem>
                <MenuItem value="O">Otro</MenuItem>
              </TextField>
              <TextField select fullWidth label="Talla" value={formData.size} onChange={e => setFormData({...formData, size: e.target.value})}>
                {sizes.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            </div>
            <div className="flex justify-between mt-6">
              <Button onClick={() => setStep(0)}>Atrás</Button>
              <Button variant="contained" onClick={handleSubmit} disabled={loading || !formData.firstName || !formData.lastName || !formData.email}>
                {loading ? <CircularProgress size={24} /> : 'Confirmar Inscripción'}
              </Button>
            </div>
          </Box>
        )}

        {step === 2 && (
          <Box className="text-center py-8">
            <Typography variant="h5" className="text-green-600 mb-4">¡Inscripción Exitosa!</Typography>
            <Typography>Te hemos enviado un correo de confirmación.</Typography>
          </Box>
        )}
      </Paper>
    </ThemeProvider>
  );
}