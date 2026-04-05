'use client';

import React, { useState, useEffect, useRef } from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'btn-yappy': any;
    }
  }
}

import { 
  TextField, Button, Select, MenuItem, FormControl, InputLabel, 
  Box, Typography, Stepper, Step, StepLabel, Alert, Paper, Snackbar,
  ThemeProvider, createTheme, CssBaseline, Autocomplete
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const ACCENT = '#FF6B00'; // Naranja STRYD

// Eliminamos API_BASE y el uso directo de variables de entorno en el cliente
// Las peticiones se harán a las rutas de API locales de Astro

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
      default: '#0f0f0f',
      paper: '#1a1a1a',
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
  title: string;
  status: string;
  data?: {
    title?: string;
    description?: string;
    date?: string;
    startTime?: string;
    location?: string;
    price?: number;
    imageUrl?: string;
    technicalInfo?: string;
    termsAndConditions?: string;
    showTimer?: boolean;
    showShirtSize?: boolean;
    teamEnabled?: boolean;
    status?: string;
  };
}

interface Category {
  id: string;
  name: string;
}

interface Distance {
  id: string;
  name: string;
  price?: number | null;
  kilometers?: number | null;
}

const steps = ['Carrera', 'Datos', 'Método de Pago', 'Confirmación'];
const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const paymentMethods = [
  { value: 'yappy', label: 'Yappy' },
  { value: 'transfer', label: 'Transferencia Bancaria' },
  { value: 'card', label: 'Tarjeta de Crédito/Débito' },
  { value: 'cash', label: 'Efectivo en persona' },
];

const countriesList = [
  "Panamá", "Costa Rica", "Colombia", "Venezuela", "Estados Unidos", "México", "Argentina", "España", "Chile", "Perú",
  "Ecuador", "Guatemala", "Honduras", "Nicaragua", "El Salvador", "Brasil", "Uruguay", "Paraguay", "Bolivia", "Canadá", "Otro"
];

const days = Array.from({length: 31}, (_, i) => String(i + 1).padStart(2, '0'));
const months = [
  { val: '01', lab: 'Enero' }, { val: '02', lab: 'Febrero' }, { val: '03', lab: 'Marzo' },
  { val: '04', lab: 'Abril' }, { val: '05', lab: 'Mayo' }, { val: '06', lab: 'Junio' },
  { val: '07', lab: 'Julio' }, { val: '08', lab: 'Agosto' }, { val: '09', lab: 'Septiembre' },
  { val: '10', lab: 'Octubre' }, { val: '11', lab: 'Noviembre' }, { val: '12', lab: 'Diciembre' }
];
const currentYear = new Date().getFullYear();
const years = Array.from({length: 100}, (_, i) => String(currentYear - i));

export default function RegistrationForm({ raceId, initialRaces = [], sonicjsApiUrl }: { raceId: string; initialRaces?: any[]; sonicjsApiUrl?: string }) {
  const [step, setStep] = useState(0);
  const [races, setRaces] = useState<Race[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [distances, setDistances] = useState<Distance[]>([]);
  const [teamOptions, setTeamOptions] = useState<string[]>([]);
  const [selectedRace, setSelectedRace] = useState(raceId);
  const [raceInfo, setRaceInfo] = useState<Race | null>(null);
  const [code, setCode] = useState('');
  const [codeValid, setCodeValid] = useState<{ valid: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'light' | 'dark'>(getInitialTheme);
  const [registrationType, setRegistrationType] = useState<'individual' | 'team'>('individual');
  
  const [teamName, setTeamName] = useState('');
  const [manualTeamNameGroup, setManualTeamNameGroup] = useState('');

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '', cedula: '', country: 'Panamá',
    birthDay: '', birthMonth: '', birthYear: '', gender: '', category: '', distance: '', teamName: '', size: '', paymentMethod: '', photoUrl: ''
  });
  const [manualTeamNameInd, setManualTeamNameInd] = useState('');

  // --- Foto y Lookup de Corredor ---
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [runnerLookupStatus, setRunnerLookupStatus] = useState<'idle' | 'loading' | 'found' | 'new'>('idle');

  const resizeImage = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 800;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = (height / width) * MAX; width = MAX; }
          else { width = (width / height) * MAX; height = MAX; }
        }
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !formData.cedula) return;
    setPhotoUploading(true);
    try {
      const base64 = await resizeImage(file);
      setPhotoPreview(base64);
      const res = await fetch('/api/upload-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, cedula: formData.cedula })
      });
      const data = await res.json();
      if (data.url) setFormData(prev => ({ ...prev, photoUrl: data.url }));
    } catch (e) { console.error('Photo upload failed', e); }
    setPhotoUploading(false);
  };

  const lookupByCedula = async () => {
    if (!formData.cedula.trim()) return;
    setRunnerLookupStatus('loading');
    try {
      const res = await fetch(`/api/lookup-runner?cedula=${encodeURIComponent(formData.cedula.trim())}`);
      const data = await res.json();
      if (data.found && data.runner) {
        const r = data.runner;
        const [birthYear, birthMonth, birthDay] = (r.birthDate || '--').split('-');
        setFormData(prev => ({
          ...prev,
          firstName: r.firstName || prev.firstName,
          lastName: r.lastName || prev.lastName,
          email: r.email || prev.email,
          phone: r.phone || prev.phone,
          gender: r.gender || prev.gender,
          country: r.country || prev.country,
          birthYear: birthYear || prev.birthYear,
          birthMonth: birthMonth || prev.birthMonth,
          birthDay: birthDay || prev.birthDay,
          photoUrl: r.photoUrl || prev.photoUrl,
        }));
        if (r.photoUrl) setPhotoPreview(r.photoUrl);
        setRunnerLookupStatus('found');
      } else {
        setRunnerLookupStatus('new');
      }
    } catch { setRunnerLookupStatus('new'); }
  };

  // Helper for generating initial blank members
  const createEmptyMember = () => ({
    firstName: '', lastName: '', email: '', phone: '', cedula: '', country: 'Panamá',
    birthDay: '', birthMonth: '', birthYear: '', gender: '', size: ''
  });

  const [teamMembers, setTeamMembers] = useState([
    createEmptyMember(), createEmptyMember(), createEmptyMember(), createEmptyMember()
  ]);

  const updateTeamMember = (index: number, field: string, value: string) => {
    setTeamMembers(prev => prev.map((member, i) => 
      i === index ? { ...member, [field]: value } : member
    ));
  };

  const isIndividualValid = () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.cedula || !formData.country) return false;
    if (!formData.birthDay || !formData.birthMonth || !formData.birthYear) return false;
    if (formData.teamName === 'Agregar manualmente' && !manualTeamNameInd) return false;
    return true;
  };

  const isTeamMembersValid = () => {
    if (registrationType !== 'team') return true;
    if (!teamName || (teamName === 'Agregar manualmente' && !manualTeamNameGroup)) return false;
    return teamMembers.every(m => 
      m.firstName && m.lastName && m.email && m.cedula && m.country && m.birthDay && m.birthMonth && m.birthYear
    );
  };

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const loadRaceInfo = (id: string) => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/race-info?raceId=${id}`)
      .then(res => res.json())
      .then(d => {
        if (d.race) setRaceInfo(d.race);
        if (d.categories) setCategories(d.categories);
        if (d.distances) setDistances(d.distances);
      })
      .catch(err => console.error('Error loading race info:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.mode) setMode(detail.mode);
    };
    window.addEventListener('themechange', handleThemeChange);
    return () => window.removeEventListener('themechange', handleThemeChange);
  }, []);

  useEffect(() => {
    if (initialRaces && initialRaces.length > 0) {
      setRaces(initialRaces);
    }
    // Los equipos ahora se cargan a través de nuestro proxy de info de carrera o un endpoint dedicado
    // Por simplicidad, si el endpoint /api/teams no existe en Astro, fallará silenciosamente como antes
    fetch(`/api/teams`).then(r => r.json()).then(d => {
      if(d.teams) setTeamOptions(d.teams.map((t: any) => t.name));
    }).catch(err => {
      console.log('Teams endpoint not available (expected):', err.message);
      // Continue without teams - not critical for registration
    });
  }, [initialRaces]);

  useEffect(() => {
    if (selectedRace) {
      loadRaceInfo(selectedRace);
      setFormData(prev => ({ ...prev, category: '', distance: '' }));
    }
  }, [selectedRace]);

  const validateCode = async () => {
    if (!code.trim() || !selectedRace) {
      setCodeValid({ valid: false, message: 'Seleccione una carrera y escriba un código' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/validate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim().toUpperCase(), raceId: selectedRace })
      });
      const data = await res.json();
      setCodeValid({ valid: data.valid, message: data.message });
    } catch {
      setCodeValid({ valid: false, message: 'Error de conexión al validar código.' });
    }
    setLoading(false);
  };

  interface ParticipantData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  cedula: string;
  country: string;
  birthDate: string;
  gender: string;
  size: string;
  raceId: string;
  categoryId: string | null;
  distanceId: string | null;
  paymentMethod: string;
  termsAccepted: boolean;
  discountCode: string;
  registrationType: 'individual' | 'team';
  teamName?: string;
  teamMembers?: Array<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    cedula: string;
    country: string;
    birthDate: string;
    gender: string;
    size: string;
  }>;
}

const handleSubmit = async () => {
    setLoading(true);
    try {
      // Prepare data for SonicJS participants collection
      const participantData: ParticipantData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        cedula: formData.cedula,
        country: formData.country,
        birthDate: `${formData.birthYear}-${formData.birthMonth}-${formData.birthDay}`,
        gender: formData.gender,
        size: raceInfo?.data?.showShirtSize !== false ? formData.size : '',
        raceId: selectedRace,
        categoryId: formData.category || null,
        distanceId: formData.distance || null,
        paymentMethod: (codeValid && codeValid.valid) ? 'Boleto Físico (100% Dscto)' : formData.paymentMethod,
        termsAccepted: termsAccepted,
        discountCode: code,
        registrationType: registrationType
      };

      if (registrationType === 'team') {
        participantData.teamName = teamName === 'Agregar manualmente' ? manualTeamNameGroup : (teamName === 'Ninguno' ? '' : teamName);
        participantData.teamMembers = teamMembers.map(m => ({
          ...m,
          size: raceInfo?.data?.showShirtSize !== false ? m.size : '',
          birthDate: `${m.birthYear}-${m.birthMonth}-${m.birthDay}`
        }));
      } else {
        participantData.teamName = formData.teamName === 'Agregar manualmente' ? manualTeamNameInd : (formData.teamName === 'Ninguno' ? '' : formData.teamName);
      }

      // Usamos el nuevo endpoint de Astro que maneja la autenticación y SonicJS server-side
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(participantData)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Error al registrar');
      setNotification({ message: 'Registro exitoso', type: 'success' });
      setStep(3);
    } catch (e: any) {
      console.error('Registration error:', e);
      setNotification({ message: e.message || 'Error al registrar', type: 'error' });
    }
    setLoading(false);
  };

  const getTeamAutocompleteOptions = () => ['Ninguno', 'Agregar manualmente', ...teamOptions];

  const yappyBtnRef = useRef<any>(null);

  // Yappy Event Listeners setup
  useEffect(() => {
    const bp = yappyBtnRef.current;
    if (!bp) return;

    const handleYappyClick = async () => {
      if (codeValid && codeValid.valid) {
         handleSubmit();
         return;
      }

      setLoading(true);
      try {
        // 1. Guardar la orden inicial llamando al backend (queda en status 'Pendiente')
        const participantData: ParticipantData = {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone,
            cedula: formData.cedula,
            country: formData.country,
            birthDate: `${formData.birthYear}-${formData.birthMonth}-${formData.birthDay}`,
            gender: formData.gender,
            size: raceInfo?.data?.showShirtSize !== false ? formData.size : '',
            raceId: selectedRace,
            categoryId: formData.category || null,
            distanceId: formData.distance || null,
            paymentMethod: 'Yappy (Pendiente)', // Marcador inicial temporal
            termsAccepted: termsAccepted,
            discountCode: code,
            registrationType: registrationType
        };

        if (registrationType === 'team') {
            participantData.teamName = teamName === 'Agregar manualmente' ? manualTeamNameGroup : (teamName === 'Ninguno' ? '' : teamName);
            participantData.teamMembers = teamMembers.map(m => ({
            ...m,
            size: raceInfo?.data?.showShirtSize !== false ? m.size : '',
            birthDate: `${m.birthYear}-${m.birthMonth}-${m.birthDay}`
            }));
        } else {
            participantData.teamName = formData.teamName === 'Agregar manualmente' ? manualTeamNameInd : (formData.teamName === 'Ninguno' ? '' : formData.teamName);
        }

        const resReg = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(participantData)
        });
        const dataReg = await resReg.json();
        
        if (!resReg.ok) throw new Error(dataReg.message || 'Error guardando registro previo');

        // SonicJS returns the item inside dataReg.data[0].id usually. Let's find it.
        // Also result spreads inside dataReg directly if it's merged.
        let orderId = '';
        if (dataReg.data && Array.isArray(dataReg.data) && dataReg.data[0]) orderId = dataReg.data[0].id;
        else if (dataReg.data?.id) orderId = dataReg.data.id;
        else orderId = dataReg.id || `TMP_${Date.now()}`;

        const totalAmount = races.find(r => r.id === selectedRace)?.data?.price || 0;
        const telYappy = formData.phone; // Usamos el num del form temporalmente

        // 2. Llamar al endpoint de checkout backend
        const resCheck = await fetch('/api/yappy/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId, total: totalAmount, telefono: telYappy })
        });
        const paymentData = await resCheck.json();

        if (paymentData.success) {
            // 3. Invocar pasarela gráfica
            bp.eventPayment({ ...paymentData.body });
        } else {
            setNotification({ message: 'Error de Yappy: ' + paymentData.error, type: 'error' });
        }
      } catch (e: any) {
        setNotification({ message: e.message || 'Error iniciando Yappy', type: 'error' });
      }
      setLoading(false);
    };

    const handleYappySuccess = (e: any) => {
      // Yappy dice que se hizo exitoso visualmente
      setNotification({ message: '¡Pago Yappy exitoso!', type: 'success' });
      setStep(3); // Ir a confirmación
    };

    bp.addEventListener('eventClick', handleYappyClick);
    bp.addEventListener('eventSuccess', handleYappySuccess);

    return () => {
      bp.removeEventListener('eventClick', handleYappyClick);
      bp.removeEventListener('eventSuccess', handleYappySuccess);
    };
  }, [formData, selectedRace, races, raceInfo, teamName, manualTeamNameGroup, manualTeamNameInd, teamMembers, code, codeValid, registrationType, termsAccepted]);

  return (
    <ThemeProvider theme={mode === 'dark' ? darkTheme : lightTheme}>
      <CssBaseline />
      <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, borderRadius: '32px' }}>
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
{races.map((r) => {
  const raceTitle = r.data?.title || r.title || 'Sin nombre';
  const racePrice = r.data?.price !== null ? r.data?.price : 0;
  return (
    <MenuItem key={r.id} value={r.id}>
      {raceTitle} - ${racePrice}
    </MenuItem>
  );
})}
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField fullWidth label="Código de descuento (opcional)" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ej: STRYD2024" />
              <Button variant="outlined" onClick={validateCode} disabled={loading} sx={{ borderColor: ACCENT, color: ACCENT, '&:hover': { backgroundColor: 'rgba(255,107,0,0.08)' } }}>
                Validar
              </Button>
            </Box>
            
            {codeValid && <Typography color={codeValid.valid ? 'success.main' : 'error.main'} variant="body2">{codeValid.message}</Typography>}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button variant="contained" onClick={() => setStep(1)} disabled={!selectedRace} endIcon={<NavigateNextIcon />} sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#E55A00' } }}>
                Continuar
              </Button>
            </Box>
          </Box>
        )}

        {step === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Tipo de Inscripción</Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button variant={registrationType === 'individual' ? 'contained' : 'outlined'} onClick={() => setRegistrationType('individual')} sx={{ bgcolor: registrationType === 'individual' ? ACCENT : undefined }}>
                  Individual
                </Button>
                {raceInfo?.data?.teamEnabled && (
                  <Button variant={registrationType === 'team' ? 'contained' : 'outlined'} onClick={() => setRegistrationType('team')} sx={{ bgcolor: registrationType === 'team' ? ACCENT : undefined }}>
                    Equipo (4 personas)
                  </Button>
                )}
              </Box>
            </Box>

            {registrationType === 'individual' && (
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                {/* Cédula primero + botón de búsqueda */}
                <Box sx={{ gridColumn: '1 / -1', display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  <TextField
                    label="Cédula / Pasaporte *"
                    value={formData.cedula}
                    onChange={(e) => { setFormData({...formData, cedula: e.target.value}); setRunnerLookupStatus('idle'); }}
                    placeholder="Ej: 4-111-1111"
                    required
                    fullWidth
                  />
                  <Button
                    variant="outlined"
                    onClick={lookupByCedula}
                    disabled={!formData.cedula.trim() || runnerLookupStatus === 'loading'}
                    sx={{ borderColor: ACCENT, color: ACCENT, whiteSpace: 'nowrap', mt: 0.5, px: 2, py: 1.8 }}
                  >
                    {runnerLookupStatus === 'loading' ? '...' : 'Buscar Datos'}
                  </Button>
                </Box>

                {runnerLookupStatus === 'found' && (
                  <Alert severity="success" sx={{ gridColumn: '1 / -1' }}>
                    ✅ ¡Te encontramos! Tus datos fueron pre-rellenados. Verifica que todo esté correcto.
                  </Alert>
                )}
                {runnerLookupStatus === 'new' && (
                  <Alert severity="info" sx={{ gridColumn: '1 / -1' }}>
                    👋 Primera vez con nosotros. Completa tus datos — los guardaremos para tu próxima carrera.
                  </Alert>
                )}

                <TextField label="Nombre *" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} placeholder="Ej: Juan" required />
                <TextField label="Apellido *" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} placeholder="Ej: Pérez" required />
                <Autocomplete
                  options={countriesList}
                  value={formData.country}
                  onChange={(_, newValue) => setFormData({...formData, country: newValue || ''})}
                  renderInput={(params) => <TextField {...params} label="Nacionalidad *" placeholder="Ej: Panamá" required />}
                />
                <TextField label="Email *" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="Ej: juan@correo.com" required sx={{ gridColumn: '1 / -1' }}/>
                <TextField label="Celular o teléfono *" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="Ej: 6123-4567" required sx={{ gridColumn: '1 / -1' }}/>
                
                <Box sx={{ display: 'flex', gap: 1, gridColumn: '1 / -1' }}>
                  <Typography variant="body2" sx={{ alignSelf: 'center', mr: 2 }}>Nacimiento *</Typography>
                  <FormControl fullWidth size="small">
                    <InputLabel>Día</InputLabel>
                    <Select value={formData.birthDay} label="Día" onChange={(e) => setFormData({...formData, birthDay: e.target.value})}>
                      {days.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth size="small">
                    <InputLabel>Mes</InputLabel>
                    <Select value={formData.birthMonth} label="Mes" onChange={(e) => setFormData({...formData, birthMonth: e.target.value})}>
                      {months.map(m => <MenuItem key={m.val} value={m.val}>{m.lab}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth size="small">
                    <InputLabel>Año</InputLabel>
                    <Select value={formData.birthYear} label="Año" onChange={(e) => setFormData({...formData, birthYear: e.target.value})}>
                      {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Box>

                <FormControl fullWidth>
                  <InputLabel>Género</InputLabel>
                  <Select value={formData.gender} label="Género" onChange={(e) => setFormData({...formData, gender: e.target.value})}>
                    <MenuItem value="M">Masculino</MenuItem>
                    <MenuItem value="F">Femenino</MenuItem>
                  </Select>
                </FormControl>
                
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Autocomplete
                    options={getTeamAutocompleteOptions()}
                    value={formData.teamName || null}
                    onChange={(_, newValue) => setFormData({...formData, teamName: newValue || ''})}
                    renderInput={(params) => <TextField {...params} label="Equipo (Opcional)" placeholder="Selecciona un equipo" />}
                  />
                  {formData.teamName === 'Agregar manualmente' && (
                    <TextField 
                      label="Escribe tu equipo *" 
                      value={manualTeamNameInd} 
                      onChange={(e) => setManualTeamNameInd(e.target.value)} 
                      placeholder="Ej: Los Runners"
                      fullWidth 
                      sx={{ mt: 2 }}
                      required
                    />
                  )}
                </Box>

                {/* Sección de foto */}
                <Box sx={{ gridColumn: '1 / -1', border: '1px dashed', borderColor: 'divider', borderRadius: 3, p: 2.5 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5 }}>📸 Foto del Corredor <Typography component="span" variant="caption" color="text.secondary">(opcional — para tu certificado y el podio)</Typography></Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Box sx={{
                      width: 90, height: 90, borderRadius: '50%', overflow: 'hidden',
                      border: `3px solid ${ACCENT}`, flexShrink: 0,
                      bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {photoPreview
                        ? <img src={photoPreview} alt="foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <Typography variant="h4">🏃</Typography>
                      }
                    </Box>
                    <Box>
                      <input
                        type="file"
                        accept="image/*"
                        id="photo-upload-input"
                        style={{ display: 'none' }}
                        onChange={handlePhotoChange}
                        disabled={!formData.cedula.trim()}
                      />
                      <label htmlFor="photo-upload-input">
                        <Button
                          component="span"
                          variant="outlined"
                          disabled={!formData.cedula.trim() || photoUploading}
                          sx={{ borderColor: ACCENT, color: ACCENT }}
                        >
                          {photoUploading ? 'Subiendo...' : photoPreview ? 'Cambiar Foto' : 'Subir Foto'}
                        </Button>
                      </label>
                      {!formData.cedula.trim() && (
                        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                          Ingresa tu cédula primero para subir una foto.
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>
              </Box>
            )}


            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>

              {categories.length > 0 && (
                <FormControl fullWidth>
                  <InputLabel>Categoría</InputLabel>
                  <Select value={formData.category} label="Categoría" onChange={(e) => setFormData({...formData, category: e.target.value})}>
                    <MenuItem value="">Ninguna</MenuItem>
                    {categories.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                  </Select>
                </FormControl>
              )}
              {distances.length > 0 && (() => {
                // Individual: excluir distancias de equipo. Equipo: solo distancias de equipo.
                const filteredDistances = registrationType === 'team'
                  ? distances.filter(d => d.name.toLowerCase().startsWith('equipo'))
                  : distances.filter(d => !d.name.toLowerCase().startsWith('equipo'));
                if (filteredDistances.length === 0) return null;
                return (
                  <FormControl fullWidth>
                    <InputLabel>Distancia a correr *</InputLabel>
                    <Select value={formData.distance} label="Distancia a correr *" onChange={(e) => setFormData({...formData, distance: e.target.value})} required>
                      {filteredDistances.map((d) => (
                        <MenuItem key={d.id} value={d.id}>
                          {d.name}{d.price != null ? ` — $${d.price}` : ''}{d.kilometers ? ` (${d.kilometers}km)` : ''}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                );
              })()}
              {formData.distance && (() => {
                const selected = distances.find(d => d.id === formData.distance);
                const price = selected?.price ?? raceInfo?.data?.price ?? null;
                if (price == null) return null;
                return (
                  <Box sx={{ gridColumn: '1 / -1', bgcolor: `${ACCENT}18`, border: `1px solid ${ACCENT}`, borderRadius: 2, p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Precio de inscripción:</Typography>
                    <Typography variant="h6" sx={{ color: ACCENT, fontWeight: 900 }}>${price}</Typography>
                    <Typography variant="body2" color="text.secondary">— {selected?.name}</Typography>
                  </Box>
                );
              })()}
              {registrationType === 'individual' && raceInfo?.data?.showShirtSize !== false && (
                <FormControl fullWidth>
                  <InputLabel>Talla de Camiseta</InputLabel>
                  <Select value={formData.size} label="Talla de Camiseta" onChange={(e) => setFormData({...formData, size: e.target.value})}>
                    {sizes.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </Select>
                </FormControl>
              )}
            </Box>

            {registrationType === 'team' && (
              <Box sx={{ mb: 2 }}>
                <Box sx={{ mb: 3 }}>
                  <TextField
                    fullWidth
                    label="Nombre para este equipo *"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Ej: Los Velocistas"
                    required
                    helperText="Inventa un nombre creativo para tu equipo."
                  />
                </Box>
                
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                  Datos de los 4 integrantes del equipo:
                </Typography>

                {teamMembers.map((member, index) => (
                  <Paper key={index} sx={{ p: 2, mb: 2, bgcolor: 'action.hover', borderRadius: '16px' }}>
                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold', color: ACCENT }}>
                      Integrante {index + 1} {index === 0 ? '(Capitán)' : ''}
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                      <TextField label="Nombre *" value={member.firstName} onChange={(e) => updateTeamMember(index, 'firstName', e.target.value)} placeholder="Ej: Juan" size="small" />
                      <TextField label="Apellido *" value={member.lastName} onChange={(e) => updateTeamMember(index, 'lastName', e.target.value)} placeholder="Ej: Pérez" size="small" />
                      <TextField label="Cédula *" value={member.cedula} onChange={(e) => updateTeamMember(index, 'cedula', e.target.value)} placeholder="Ej: 4-111-1111" size="small" />
                      
                      <Autocomplete
                        options={countriesList}
                        value={member.country}
                        onChange={(_, newValue) => updateTeamMember(index, 'country', newValue || '')}
                        renderInput={(params) => <TextField {...params} label="Nacionalidad *" placeholder="Ej: Panamá" size="small" required />}
                      />
                      
                      <TextField label="Email *" type="email" value={member.email} onChange={(e) => updateTeamMember(index, 'email', e.target.value)} placeholder="Ej: juan@correo.com" size="small" sx={{ gridColumn: '1 / -1' }}/>
                      <TextField label="Celular *" value={member.phone} onChange={(e) => updateTeamMember(index, 'phone', e.target.value)} placeholder="Ej: 6123-4567" size="small" sx={{ gridColumn: '1 / -1' }}/>

                      <Box sx={{ display: 'flex', gap: 1, gridColumn: '1 / -1' }}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Día</InputLabel>
                          <Select value={member.birthDay} label="Día" onChange={(e) => updateTeamMember(index, 'birthDay', e.target.value)}>
                            {days.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                          </Select>
                        </FormControl>
                        <FormControl fullWidth size="small">
                          <InputLabel>Mes</InputLabel>
                          <Select value={member.birthMonth} label="Mes" onChange={(e) => updateTeamMember(index, 'birthMonth', e.target.value)}>
                            {months.map(m => <MenuItem key={m.val} value={m.val}>{m.lab}</MenuItem>)}
                          </Select>
                        </FormControl>
                        <FormControl fullWidth size="small">
                          <InputLabel>Año</InputLabel>
                          <Select value={member.birthYear} label="Año" onChange={(e) => updateTeamMember(index, 'birthYear', e.target.value)}>
                            {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </Box>

                      <FormControl size="small">
                        <InputLabel>Género</InputLabel>
                        <Select value={member.gender} label="Género" onChange={(e) => updateTeamMember(index, 'gender', e.target.value)}>
                          <MenuItem value="M">Masculino</MenuItem>
                          <MenuItem value="F">Femenino</MenuItem>
                        </Select>
                      </FormControl>
                      {raceInfo?.data?.showShirtSize !== false && (
                        <FormControl size="small">
                          <InputLabel>Talla</InputLabel>
                          <Select value={member.size} label="Talla" onChange={(e) => updateTeamMember(index, 'size', e.target.value)}>
                            {sizes.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                          </Select>
                        </FormControl>
                      )}
                    </Box>
                  </Paper>
                ))}
              </Box>
            )}

            {raceInfo?.data?.technicalInfo && (
              <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>Información Técnica:</Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{raceInfo.data?.technicalInfo}</Typography>
              </Box>
            )}

            {raceInfo?.data?.termsAndConditions && (
              <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>Términos y Condiciones / Disclaimer:</Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', maxHeight: 150, overflow: 'auto' }}>
                  {raceInfo.data?.termsAndConditions}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                  <input type="checkbox" id="termsAccepted" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} style={{ marginRight: 8 }} />
                  <Typography variant="body2">He leído y acepto los términos y condiciones *</Typography>
                </Box>
              </Box>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
              <Button variant="outlined" onClick={() => setStep(0)} startIcon={<ArrowBackIcon />}>Atrás</Button>
              <Button
                variant="contained"
                onClick={() => {
                   if (codeValid && codeValid.valid) {
                      handleSubmit();
                   } else {
                      setStep(2);
                   }
                }}
                disabled={
                  (registrationType === 'individual' && !isIndividualValid()) ||
                  (registrationType === 'team' && !isTeamMembersValid()) ||
                  (distances.length > 0 && !formData.distance) ||
                  !!((raceInfo?.data?.termsAndConditions) && !termsAccepted) ||
                  loading
                }
                endIcon={<NavigateNextIcon />}
                sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#E55A00' } }}
              >
                {codeValid && codeValid.valid ? 'Completar Registro' : 'Continuar'}
              </Button>
            </Box>
          </Box>
        )}

        {step === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Selecciona tu método de pago</Typography>
            
            <FormControl fullWidth>
              <InputLabel>Método de Pago *</InputLabel>
              <Select value={formData.paymentMethod} label="Método de Pago *" onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}>
                {paymentMethods.map((pm) => <MenuItem key={pm.value} value={pm.value}>{pm.label}</MenuItem>)}
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
<Typography variant="body2">Carrera: {races.find(r => r.id === selectedRace)?.data?.title || races.find(r => r.id === selectedRace)?.title || '-'}</Typography>
<Typography variant="body2">Participante: {formData.firstName} {formData.lastName}</Typography>
<Typography variant="body2" fontWeight="bold" sx={{ mt: 1 }}>Total: ${races.find(r => r.id === selectedRace)?.data?.price || 0}</Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, alignItems: 'center' }}>
              <Button variant="outlined" onClick={() => setStep(1)} startIcon={<ArrowBackIcon />}>Atrás</Button>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {formData.paymentMethod === 'yappy' ? (
                  <Box>
                    {/* @ts-ignore */}
                    <btn-yappy ref={yappyBtnRef} theme="orange" rounded="true" disabled={loading ? "true" : "false"}></btn-yappy>
                    {loading && <Typography variant="caption" sx={{ ml: 2, color: 'text.secondary' }}>Procesando...</Typography>}
                  </Box>
                ) : (
                  <Button variant="contained" onClick={handleSubmit} disabled={loading || !formData.paymentMethod} sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#E55A00' } }}>
                    {loading ? 'Procesando...' : 'Confirmar Inscripción'}
                  </Button>
                )}
              </Box>
            </Box>
          </Box>
        )}

        {step === 3 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
            <Typography variant="h4" sx={{ mb: 2, color: 'success.main' }}>¡Inscripción Exitosa!</Typography>
            <Typography color="text.secondary">Te hemos enviado un correo de confirmación.</Typography>
          </Box>
        )}

        <Snackbar open={!!notification} autoHideDuration={4000} onClose={() => setNotification(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Box>{notification && <Alert severity={notification.type} sx={{ width: '100%' }}>{notification.message}</Alert>}</Box>
        </Snackbar>
      </Paper>
    </ThemeProvider>
  );
}
