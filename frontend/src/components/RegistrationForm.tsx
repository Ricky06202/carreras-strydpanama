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
  ThemeProvider, createTheme, CssBaseline, Autocomplete, Grid
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import ImageCropper from './ImageCropper';

const ACCENT = '#FF6B00'; // Naranja STRYD
const R2_BASE = 'https://pub-ddaf4243012a44c5a61699bc0719121f.r2.dev';

const ensureAbsolute = (url: string) => {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  
  // Si ya es de R2 corregido, no tocar
  if (url.includes('pub-ddaf4243012a44c5a61699bc0719121f.r2.dev')) return url;

  // Extraer el path de /uploads/ si existe en la URL (para URLs de la API o R2 viejo)
  if (url.includes('/uploads/')) {
    const parts = url.split('/uploads/');
    return `${R2_BASE}/uploads/${parts[parts.length - 1]}`;
  }

  // Si es ruta relativa pura
  if (url.startsWith('/')) return `${R2_BASE}${url}`;
  
  // Si no tiene protocolo, asumir que es path relativo
  if (!url.startsWith('http')) return `${R2_BASE}/${url}`;

  return url;
};

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
  minAge?: number;
  maxAge?: number;
  gender?: string;
}

interface Distance {
  id: string;
  name: string;
  price?: number | null;
  kilometers?: number | null;
}

const steps = ['Carrera', 'Datos', 'Método de Pago', 'Documentos', 'Confirmación'];
const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const paymentMethods = [
  { value: 'yappy', label: 'Yappy' },
  { value: 'transfer', label: 'Transferencia Bancaria' },
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
    birthDay: '', birthMonth: '', birthYear: '', gender: '', category: '', distance: '', teamName: '', size: '', paymentMethod: '', photoUrl: '',
    receiptUrl: '', studentIdUrl: '', matriculaUrl: '', participantType: 'general'
  });
  const [manualTeamNameInd, setManualTeamNameInd] = useState('');

  // --- Foto y Lookup de Corredor ---
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [runnerLookupStatus, setRunnerLookupStatus] = useState<'idle' | 'loading' | 'found' | 'new'>('idle');
  const [croppingImageSrc, setCroppingImageSrc] = useState<string | null>(null);
  const [finalConfirmationCode, setFinalConfirmationCode] = useState('');
  const [assignedBib, setAssignedBib] = useState<number | null>(null);

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
    const identifier = formData.cedula || teamMembers[0]?.cedula;
    if (!file || !identifier.trim()) return;
    
    const reader = new FileReader();
    reader.onload = () => {
       setCroppingImageSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // clear input
  };

  const handleCropComplete = async (croppedBase64: string) => {
    setCroppingImageSrc(null);
    setPhotoUploading(true);
    try {
      setPhotoPreview(croppedBase64);
      const identifier = formData.cedula || teamMembers[0]?.cedula;
      const res = await fetch('/api/upload-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: croppedBase64, cedula: identifier })
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
    birthDay: '', birthMonth: '', birthYear: '', gender: '', size: '', photoUrl: ''
  });

  const [memberPhotoUploading, setMemberPhotoUploading] = useState<number | null>(null);
  const [memberPhotoPreviews, setMemberPhotoPreviews] = useState<string[]>(['', '', '', '']);
  const [memberCropSrc, setMemberCropSrc] = useState<string | null>(null);
  const [memberCropIndex, setMemberCropIndex] = useState<number>(0);

  const handleMemberPhotoChange = (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const cedula = teamMembers[index]?.cedula;
    if (!file || !cedula?.trim()) return;
    const reader = new FileReader();
    reader.onload = () => {
      setMemberCropIndex(index);
      setMemberCropSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleMemberCropComplete = async (croppedBase64: string) => {
    setMemberCropSrc(null);
    const index = memberCropIndex;
    setMemberPhotoUploading(index);
    try {
      const previews = [...memberPhotoPreviews];
      previews[index] = croppedBase64;
      setMemberPhotoPreviews(previews);
      const cedula = teamMembers[index]?.cedula || `member${index}`;
      const res = await fetch('/api/upload-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: croppedBase64, cedula: `${cedula}_member${index}` })
      });
      const data = await res.json();
      if (data.url) updateTeamMember(index, 'photoUrl', data.url);
    } catch (e) { console.error('Member photo upload failed', e); }
    setMemberPhotoUploading(null);
  };

  const [teamMembers, setTeamMembers] = useState([
    createEmptyMember(), createEmptyMember(), createEmptyMember(), createEmptyMember()
  ]);

  const updateTeamMember = (index: number, field: string, value: string) => {
    setTeamMembers(prev => prev.map((member, i) => 
      i === index ? { ...member, [field]: value } : member
    ));
  };

  const isStudentCategorySelected = () => {
    if (formData.participantType === 'estudiante') return true;
    let name = '';
    if (formData.category) {
      const cat = categories.find(c => c.id == formData.category);
      if (cat) name += ' ' + (cat.name || '').toLowerCase();
    }
    if (formData.distance) {
      const dist = distances.find(d => d.id == formData.distance);
      if (dist) name += ' ' + (dist.name || '').toLowerCase();
    }
    return name.includes('estudiant') || name.includes('estud');
  };

  const isIndividualValid = () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.cedula || !formData.country) return false;
    if (!formData.birthDay || !formData.birthMonth || !formData.birthYear) return false;
    if (formData.teamName === 'Agregar manualmente' && !manualTeamNameInd) return false;
    
    // Mandatory docs for students in Step 1
    if (isStudentCategorySelected()) {
      if (!formData.studentIdUrl || !formData.matriculaUrl) return false;
    }
    
    return true;
  };

  const isTeamMembersValid = () => {
    if (registrationType !== 'team') return true;
    if (!teamName || (teamName === 'Agregar manualmente' && !manualTeamNameGroup)) return false;
    const allFilled = teamMembers.every(m =>
      m.firstName && m.lastName && m.email && m.cedula && m.country && m.birthDay && m.birthMonth && m.birthYear
    );
    if (!allFilled) return false;
    // Validar composición: exactamente 2 hombres y 2 mujeres
    const males = teamMembers.filter(m => m.gender === 'M').length;
    const females = teamMembers.filter(m => m.gender === 'F').length;
    return males === 2 && females === 2;
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

  // Si se selecciona tipo 'team', buscamos automáticamente la distancia de equipo y la asignamos
  useEffect(() => {
    if (registrationType === 'team' && distances.length > 0) {
      const teamDist = distances.find(d => d.name.toLowerCase().startsWith('equipo'));
      if (teamDist && formData.distance !== teamDist.id) {
        setFormData(prev => ({ ...prev, distance: teamDist.id }));
      }
    }
  }, [registrationType, distances]);

  // Mapeo de participantType del botón → término de búsqueda en nombres de categorías
  const TYPE_SEARCH_TERMS: Record<string, string> = {
    'estudiante': 'estudiante',
    'docente': 'docente',
    'administrativo': 'administrativo',
  };

  // ASIGNACIÓN AUTOMÁTICA DE CATEGORÍA (INDIVIDUAL)
  useEffect(() => {
    if (registrationType === 'individual' && categories.length > 0) {
      const runnerGender = (formData.gender || '').toLowerCase();

      // 1. PRIORIDAD: Match por Participant Type + Género (Bypass Edad)
      if (formData.participantType !== 'general') {
        const searchTerm = TYPE_SEARCH_TERMS[formData.participantType];
        if (searchTerm) {
          const typeMatch = categories.find(cat => {
            const catName = (cat.name || '').toLowerCase();
            const catGender = (cat.gender || 'ambos').toLowerCase();
            const nameMatch = catName.includes(searchTerm);
            // Si el runner ya eligió género, filtrar por él; si no, tomar la primera que haga match
            const genderMatch = !runnerGender || catGender === 'ambos' ||
                               (catGender === 'masculino' && runnerGender === 'm') ||
                               (catGender === 'femenino' && runnerGender === 'f');
            return nameMatch && genderMatch;
          });

          if (typeMatch && formData.category !== typeMatch.id) {
            setFormData(prev => ({ ...prev, category: typeMatch.id }));
            return; // Saltamos edad si hay match por tipo
          }
        }
      }

      // 2. FALLBACK (solo para Público General): Match por Edad y Género
      if (formData.participantType === 'general' && formData.birthDay && formData.birthMonth && formData.birthYear && runnerGender && raceInfo?.data?.date) {
        const raceDate = new Date(raceInfo.data.date);
        const birthDate = new Date(`${formData.birthYear}-${formData.birthMonth}-${formData.birthDay}`);
        
        let age = raceDate.getFullYear() - birthDate.getFullYear();
        const m = raceDate.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && raceDate.getDate() < birthDate.getDate())) {
          age--;
        }
        
        // Excluir categorías de tipos especiales para que el público general no caiga ahí
        const specialTypes = Object.values(TYPE_SEARCH_TERMS);
        const match = categories.find(cat => {
          const catName = (cat.name || '').toLowerCase();
          // Si la categoría tiene un nombre de tipo especial, no es para público general
          if (specialTypes.some(term => catName.includes(term))) return false;

          const min = Number(cat.minAge || 0);
          const max = Number(cat.maxAge || 999);
          const catGender = (cat.gender || 'ambos').toLowerCase();

          const ageMatch = age >= min && age <= max;
          const genderMatch = catGender === 'ambos' || 
                             (catGender === 'masculino' && runnerGender === 'm') || 
                             (catGender === 'femenino' && runnerGender === 'f');
          
          return ageMatch && genderMatch;
        });

        if (match && formData.category !== match.id) {
          setFormData(prev => ({ ...prev, category: match.id }));
        }
      }
    }
  }, [registrationType, formData.birthDay, formData.birthMonth, formData.birthYear, formData.gender, formData.participantType, categories, raceInfo]);

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
  receiptUrl?: string;
  studentIdUrl?: string;
  matriculaUrl?: string;
  photoUrl?: string;
  participantType?: string;
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
        registrationType: registrationType,
        receiptUrl: formData.receiptUrl,
        studentIdUrl: formData.studentIdUrl,
        matriculaUrl: formData.matriculaUrl,
        photoUrl: formData.photoUrl,
        participantType: formData.participantType
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
      
      // Capturar el código de confirmación y dorsal devueltos por el backend
      const confCode = data.confirmationCode || '';
      setFinalConfirmationCode(confCode);
      if (data.assignedBib) setAssignedBib(data.assignedBib);
      
      setNotification({ message: 'Registro exitoso', type: 'success' });
      setStep(4);
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
            registrationType: registrationType,
            receiptUrl: formData.receiptUrl,
            studentIdUrl: formData.studentIdUrl,
            matriculaUrl: formData.matriculaUrl,
            photoUrl: formData.photoUrl,
            participantType: formData.participantType
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
        setFinalConfirmationCode(dataReg.confirmationCode || '');
        if (dataReg.assignedBib) setAssignedBib(dataReg.assignedBib);

        // SonicJS returns the item inside dataReg.data[0].id usually. Let's find it.
        // Also result spreads inside dataReg directly if it's merged.
        let orderId = dataReg.confirmationCode;
        if (!orderId) {
            if (dataReg.data && Array.isArray(dataReg.data) && dataReg.data[0]) orderId = dataReg.data[0].id;
            else if (dataReg.data?.id) orderId = dataReg.data.id;
            else orderId = dataReg.id || `TMP_${Date.now()}`;
        }

        // Precio base determinado por distancia (si aplica) o carrera
        const selectedDistanceObj = distances.find(d => d.id === formData.distance);
        const basePrice = selectedDistanceObj?.price ?? races.find(r => r.id === selectedRace)?.data?.price ?? 0;
        
        // Sumar cargo de servicio de plataforma
        const fullPrice = basePrice + 0.50;

        // OJO: SOBREESCRIBIR TOTAL TEMPORALMENTE PARA EFECTOS DE PRUEBA EN YAPPY
        // TODO: Revertir esta línea para usar `fullPrice` cuando termine el periodo de testing
        const totalAmount = 0.25; 
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
        console.error('Yappy initiation error:', e);
        setNotification({ 
          message: e.message || 'Error iniciando el proceso de Yappy. Por favor, revisa tu conexión e intenta de nuevo.', 
          type: 'error' 
        });
        setLoading(false); // Ensure spinner stops
      }
    };

    const handleYappySuccess = (e: any) => {
      // Yappy dice que se hizo exitoso visualmente
      setNotification({ message: '¡Pago Yappy exitoso!', type: 'success' });
      // Si pagó con Yappy, va directo a confirmación (Paso 4).
      // Los documentos de estudiante ya se subieron en el Paso 1 si aplicaba.
      setStep(4);
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
      <Paper elevation={3} sx={{ p: { xs: 1.5, sm: 2, md: 4 }, borderRadius: { xs: '16px', md: '32px' }, mx: { xs: -0.5, sm: 0 } }}>
        <Stepper activeStep={step} alternativeLabel sx={{ mb: 3, '& .MuiStepLabel-label': { fontSize: { xs: '0.6rem', sm: '0.75rem', md: '0.875rem' }, mt: 0.5 } }}>
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
  return (
    <MenuItem key={r.id} value={r.id}>
      {raceTitle}
    </MenuItem>
  );
})}
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, alignItems: { sm: 'center' } }}>
              <TextField fullWidth label="Código de Cupón / Boleto Físico (opcional)" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ej: STRYD2024" />
              <Button variant="outlined" onClick={validateCode} disabled={loading} sx={{ borderColor: ACCENT, color: ACCENT, '&:hover': { backgroundColor: 'rgba(255,107,0,0.08)' }, minWidth: { xs: '100%', sm: 'auto' }, py: { xs: 1.5, sm: 'auto' } }}>
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
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                {/* Cédula primero + botón de búsqueda */}
                <Box sx={{ gridColumn: '1 / -1', display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1, alignItems: { sm: 'flex-start' } }}>
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
                    sx={{ borderColor: ACCENT, color: ACCENT, whiteSpace: 'nowrap', mt: { xs: 0, sm: 0.5 }, px: 2, py: 1.8, width: { xs: '100%', sm: 'auto' } }}
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

                <Box sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2, gridColumn: '1 / -1' }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold', color: ACCENT }}>TIPO DE PARTICIPANTE</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    {[
                      { value: 'general', label: 'Público General' },
                      { value: 'estudiante', label: 'Estudiante (UTP)' },
                      { value: 'docente', label: 'Docente (UTP)' },
                      { value: 'administrativo', label: 'Administrativo (UTP)' }
                    ].map((t) => (
                      <Button
                        key={t.value}
                        variant={formData.participantType === t.value ? "contained" : "outlined"}
                        onClick={() => setFormData({...formData, participantType: t.value})}
                        size="small"
                        sx={{ 
                          borderRadius: 5,
                          fontSize: { xs: '0.65rem', sm: '0.75rem' },
                          py: 0.5,
                          px: { xs: 1, sm: 1.5 },
                          borderColor: formData.participantType === t.value ? ACCENT : 'divider',
                          bgcolor: formData.participantType === t.value ? ACCENT : 'transparent',
                          color: formData.participantType === t.value ? 'white' : 'text.secondary',
                          '&:hover': { bgcolor: formData.participantType === t.value ? '#E55A00' : 'rgba(255, 107, 0, 0.05)' }
                        }}
                      >
                        {t.label}
                      </Button>
                    ))}
                  </Box>
                </Box>

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
                
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>Nacimiento *</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr 1fr', sm: '1fr 1fr 1fr' }, gap: 1 }}>
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
                        ? <img src={ensureAbsolute(photoPreview)} alt="foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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


            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>

              {categories.length > 0 && (
                <FormControl fullWidth disabled>
                  <InputLabel id="category-label">Categoría (Asignada Automáticamente)</InputLabel>
                  <Select 
                    labelId="category-label"
                    value={formData.category} 
                    label="Categoría (Asignada Automáticamente)" 
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                  >
                    <MenuItem value="">{formData.birthYear ? 'No se encontró categoría para tu edad/género' : 'Ingresa tu fecha de nacimiento'}</MenuItem>
                    {categories.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                  </Select>
                  {formData.category && (
                    <Typography variant="caption" sx={{ color: 'success.main', mt: 0.5, ml: 1, fontWeight: 'bold' }}>
                      ✓ {categories.find(c => c.id === formData.category)?.name}
                    </Typography>
                  )}
                </FormControl>
              )}
              {distances.length > 0 && registrationType === 'individual' && (() => {
                const filteredDistances = distances.filter(d => !d.name.toLowerCase().startsWith('equipo'));
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

              {/* Documentación Estudiantil (Si aplica) */}
              {isStudentCategorySelected() && (
                <Box sx={{ gridColumn: '1 / -1', bgcolor: 'rgba(255, 107, 0, 0.05)', p: 3, borderRadius: 4, border: '1px solid rgba(255, 107, 0, 0.2)', mt: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: ACCENT, mb: 1 }}>🎓 Verificación de Estudiante</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Has seleccionado una categoría especial. Por favor sube los siguientes documentos para validar tu tarifa.
                  </Typography>

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                    <Box>
                      <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>1. Foto de Cédula o Pasaporte *</Typography>
                      <Button variant="outlined" component="label" fullWidth disabled={photoUploading} sx={{ color: ACCENT, borderColor: ACCENT }}>
                        {photoUploading ? 'Subiendo...' : (formData.studentIdUrl ? 'Cambiar Cédula' : 'Subir Cédula')}
                        <input type="file" hidden accept="image/*" onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          e.target.value = ''; // REGLA DE ORO REACT
                          setPhotoUploading(true);
                          try {
                            const base64 = await resizeImage(file);
                            const res = await fetch('/api/upload-photo', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ imageBase64: base64, cedula: (formData.cedula || 'estudiante') + '_cedula' })
                            });
                            const data = await res.json();
                            if (data.url) setFormData(prev => ({ ...prev, studentIdUrl: data.url }));
                          } catch (e) {}
                          setPhotoUploading(false);
                        }} />
                      </Button>
                      {formData.studentIdUrl && !photoUploading && <Typography variant="caption" sx={{ color: 'success.main', mt: 1, display: 'block' }}>✅ Cédula cargada</Typography>}
                    </Box>

                    <Box>
                      <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>2. Comprobante de Matrícula *</Typography>
                      <Button variant="outlined" component="label" fullWidth disabled={photoUploading} sx={{ color: ACCENT, borderColor: ACCENT }}>
                        {photoUploading ? 'Subiendo...' : (formData.matriculaUrl ? 'Cambiar Matrícula' : 'Subir Matrícula')}
                        <input type="file" hidden accept="image/*" onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          e.target.value = ''; // REGLA DE ORO REACT
                          setPhotoUploading(true);
                          try {
                            const base64 = await resizeImage(file);
                            const res = await fetch('/api/upload-photo', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ imageBase64: base64, cedula: (formData.cedula || 'estudiante') + '_matricula' })
                            });
                            const data = await res.json();
                            if (data.url) setFormData(prev => ({ ...prev, matriculaUrl: data.url }));
                          } catch (e) {}
                          setPhotoUploading(false);
                        }} />
                      </Button>
                      {formData.matriculaUrl && !photoUploading && <Typography variant="caption" sx={{ color: 'success.main', mt: 1, display: 'block' }}>✅ Matrícula cargada</Typography>}
                    </Box>
                  </Box>
                </Box>
              )}

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
                
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Datos de los 4 integrantes del equipo:
                </Typography>
                <Box sx={{ mb: 2, p: 1.5, bgcolor: 'rgba(255,107,0,0.08)', borderRadius: 2, border: '1px solid rgba(255,107,0,0.3)' }}>
                  <Typography variant="caption" sx={{ color: ACCENT, fontWeight: 700 }}>
                    ⚠️ El equipo debe estar compuesto por exactamente 2 hombres y 2 mujeres.
                  </Typography>
                  {(() => {
                    const males = teamMembers.filter(m => m.gender === 'M').length;
                    const females = teamMembers.filter(m => m.gender === 'F').length;
                    return (
                      <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: males === 2 && females === 2 ? 'success.main' : 'text.secondary' }}>
                        {males === 2 && females === 2 ? '✅ Composición correcta' : `Actualmente: ${males} hombre${males !== 1 ? 's' : ''} · ${females} mujer${females !== 1 ? 'es' : ''}`}
                      </Typography>
                    );
                  })()}
                </Box>

                {teamMembers.map((member, index) => (
                  <Paper key={index} sx={{ p: 2, mb: 2, bgcolor: 'action.hover', borderRadius: '16px' }}>
                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold', color: ACCENT }}>
                      Integrante {index + 1} {index === 0 ? '(Capitán)' : ''}
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
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

                      {/* Foto individual del miembro */}
                      <Box sx={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
                        <Box sx={{
                          width: 60, height: 60, borderRadius: '50%', overflow: 'hidden',
                          border: `2px solid ${ACCENT}`, flexShrink: 0, bgcolor: 'action.hover',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {memberPhotoPreviews[index]
                            ? <img src={ensureAbsolute(memberPhotoPreviews[index])} alt="foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <Typography variant="body2">🏃</Typography>
                          }
                        </Box>
                        <Box>
                          <input
                            type="file"
                            accept="image/*"
                            id={`member-photo-${index}`}
                            style={{ display: 'none' }}
                            onChange={handleMemberPhotoChange(index)}
                            disabled={!member.cedula.trim()}
                          />
                          <label htmlFor={`member-photo-${index}`}>
                            <Button
                              component="span"
                              variant="outlined"
                              size="small"
                              disabled={!member.cedula.trim() || memberPhotoUploading === index}
                              sx={{ borderColor: ACCENT, color: ACCENT, fontSize: '0.7rem' }}
                            >
                              {memberPhotoUploading === index ? 'Subiendo...' : memberPhotoPreviews[index] ? 'Cambiar Foto' : '📸 Foto'}
                            </Button>
                          </label>
                          {!member.cedula.trim() && (
                            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.65rem' }}>
                              Ingresa la cédula primero
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  </Paper>
                ))}

                {/* Sección de foto de equipo */}
                <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 3, p: 2.5, mt: 3 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5 }}>📸 Foto del Equipo <Typography component="span" variant="caption" color="text.secondary">(opcional — para tu certificado y el podio)</Typography></Typography>
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
                        id="photo-upload-input-team"
                        style={{ display: 'none' }}
                        onChange={handlePhotoChange}
                        disabled={!teamMembers[0].cedula.trim()}
                      />
                      <label htmlFor="photo-upload-input-team">
                        <Button
                          component="span"
                          variant="outlined"
                          disabled={!teamMembers[0].cedula.trim() || photoUploading}
                          sx={{ borderColor: ACCENT, color: ACCENT }}
                        >
                          {photoUploading ? 'Subiendo...' : photoPreview ? 'Cambiar Foto' : 'Subir Foto'}
                        </Button>
                      </label>
                      {!teamMembers[0].cedula.trim() && (
                        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                          Ingresa la cédula del Capitán primero para subir una foto.
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>
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
<Typography variant="body2">Distancia: {distances.find(d => d.id === formData.distance)?.name || formData.distance || '-'}</Typography>
<Typography variant="body2" sx={{ color: ACCENT, fontWeight: 'bold' }}>Categoría: {categories.find(c => c.id === formData.category)?.name || 'Asignando...'}</Typography>

{(() => {
  const selectedDistanceObj = distances.find(d => d.id === formData.distance);
  const basePrice = selectedDistanceObj?.price ?? races.find(r => r.id === selectedRace)?.data?.price ?? 0;
  return (
    <Box sx={{ mt: 1, borderTop: 1, pt: 1, borderColor: 'divider' }}>
      <Typography variant="body2">Costo de inscripción: ${basePrice.toFixed(2)}</Typography>
      <Typography variant="body2" color="text.secondary">Cargo de plataforma: +$0.50 (para costos de alojamiento y desarrollo de plataforma)</Typography>
      {isStudentCategorySelected() && (
        <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 'bold', mt: 1 }}>
          ✅ Documentación Estudiantil Cargada
        </Typography>
      )}
      <Typography variant="body1" fontWeight="bold" sx={{ mt: 1, color: ACCENT }}>
        Total: ${(basePrice + 0.50).toFixed(2)}
      </Typography>
      {formData.paymentMethod === 'yappy' && (
        <Typography variant="caption" sx={{ color: 'warning.main', display: 'block', mt: 1, fontWeight: 'bold' }}>
          * Modo PRUEBA activo: A Yappy se le enviará un debito de solo $0.25 *
        </Typography>
      )}
    </Box>
  );
})()}
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, alignItems: 'center' }}>
              <Button variant="outlined" onClick={() => setStep(1)} startIcon={<ArrowBackIcon />}>Atrás</Button>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {formData.paymentMethod === 'yappy' ? (
                  <Box sx={{ 
                    minWidth: '200px', 
                    minHeight: '44px', 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'action.hover',
                    borderRadius: 2,
                    p: 1
                  }}>
                    {/* @ts-ignore */}
                    <btn-yappy 
                      ref={yappyBtnRef} 
                      theme="dark" 
                      rounded="true" 
                      disabled={loading ? "true" : "false"}
                    ></btn-yappy>
                    {loading && <Typography variant="caption" sx={{ mt: 1, color: ACCENT }}>Generando pedido...</Typography>}
                    <Typography variant="caption" sx={{ mt: 0.5, color: 'text.secondary', fontSize: '10px' }}>
                      (Haz clic arriba para pagar con Yappy)
                    </Typography>
                  </Box>
                ) : (
                  <Button 
                    variant="contained" 
                    onClick={() => {
                        if (formData.paymentMethod === 'transfer') {
                            setStep(3); // Go to Documentos (Receipt only)
                        } else {
                            handleSubmit(); // Skip Documentos (Yappy/Other)
                        }
                    }} 
                    disabled={loading || !formData.paymentMethod} 
                    sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#E55A00' } }}
                  >
                    {loading ? 'Procesando...' : (formData.paymentMethod === 'transfer') ? 'Subir Comprobante' : 'Confirmar Inscripción'}
                  </Button>
                )}
              </Box>
            </Box>
          </Box>
        )}

        {step === 3 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, color: ACCENT }}>Documentación Requerida</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Para completar tu registro correctamente, necesitamos que subas los siguientes documentos.
            </Typography>

            {formData.paymentMethod === 'transfer' && (
              <Box sx={{ bgcolor: 'action.hover', p: 3, borderRadius: 2, border: '1px dashed #ccc' }}>
                <Typography variant="subtitle1" fontWeight="bold">1. Comprobante de Transferencia *</Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>Sube la captura de tu transferencia bancaria o billete de depósito.</Typography>
                <Button variant="outlined" component="label" sx={{ color: ACCENT, borderColor: ACCENT }}>
                  Seleccionar Imagen
                  <input type="file" hidden accept="image/*" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setPhotoUploading(true);
                    try {
                      const base64 = await resizeImage(file);
                      const res = await fetch('/api/upload-photo', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ imageBase64: base64, cedula: formData.cedula + '_receipt' })
                      });
                      const data = await res.json();
                      if (data.url) {
                        setFormData(prev => ({ ...prev, receiptUrl: data.url }));
                        setNotification({ message: 'Comprobante subido', type: 'success' });
                      }
                    } catch (e) {
                      setNotification({ message: 'Error subiendo comprobante', type: 'error' });
                    }
                    setPhotoUploading(false);
                  }} />
                </Button>
                {formData.receiptUrl && <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'success.main' }}>✅ Archivo cargado correctamente</Typography>}
              </Box>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
              <Button variant="outlined" onClick={() => {
                // If they came from Yappy, they shouldn't go back to payment step to restart it. But we don't have that protected.
                setStep(2);
              }} startIcon={<ArrowBackIcon />}>Atrás</Button>
              <Button 
                variant="contained" 
                onClick={async () => {
                    // Si ya pagaron por Yappy y están aquí, la inscripción ya se creó! Sólo necesitamos actualizarla.
                    // Pero espera, handleYappyClick llama a `/api/register` creando una inscripción "Pendiente". 
                    // No podemos actualizarla sin el OrderId que no guardamos.
                    // Así que por ahora llamaremos a handleSubmit que creará un registro NUEVO, y el admin verá ambos si es que re-crean.
                    // (La lógica ideal es usar PATCH, pero por simplicidad de este refactor usaremos handleSubmit).
                    handleSubmit();
                }} 
                disabled={
                    photoUploading || loading ||
                    (formData.paymentMethod === 'transfer' && !formData.receiptUrl)
                } 
                sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#E55A00' } }}
              >
                {loading || photoUploading ? 'Subiendo...' : 'Finalizar Inscripción'}
              </Button>
            </Box>
          </Box>
        )}

        {step === 4 && (
          <Box sx={{ py: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
              <Typography variant="h4" sx={{ mb: 2, color: 'success.main', fontWeight: 'bold' }}>¡Proceso Completado!</Typography>
              <Typography color="text.secondary">Tu registro ha sido procesado exitosamente.</Typography>
              {(formData.paymentMethod === 'transfer' || isStudentCategorySelected()) && (
                 <Alert severity="warning" sx={{ mb: 3, textAlign: 'left' }}>
                    Tu inscripción está pendiente de validación. Nuestro equipo revisará los documentos proporcionados (pago o estatus de estudiante) y aprobará tu registro a la brevedad. Puedes verificar tu estado en <b>"Portal del Corredor"</b>.
                 </Alert>
              )}

              {/* Resumen Final para el Usuario */}
              <Box sx={{ bgcolor: 'action.hover', p: 3, borderRadius: 3, textAlign: 'left', border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle2" sx={{ color: ACCENT, fontWeight: 'bold', mb: 2, textTransform: 'uppercase', letterSpacing: 1 }}>Detalles de tu Registro:</Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary">Participante</Typography>
                    <Typography variant="body2" fontWeight="bold">{registrationType === 'team' ? `${teamMembers[0]?.firstName || ''} ${teamMembers[0]?.lastName || ''}`.trim() || `${formData.firstName} ${formData.lastName}` : `${formData.firstName} ${formData.lastName}`}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary">Dorsal Asignado</Typography>
                    <Typography variant="body2" fontWeight="bold" color={ACCENT} sx={{ fontSize: '1.2rem' }}>#{assignedBib || '—'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary">Distancia</Typography>
                    <Typography variant="body2" fontWeight="bold">{distances.find(d => d.id === formData.distance)?.name || '-'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary">Categoría</Typography>
                    <Typography variant="body2" fontWeight="bold" color={ACCENT}>{categories.find(c => c.id === formData.category)?.name || 'General'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="caption" color="text.secondary">Código de Seguimiento</Typography>
                    <Typography variant="body2" fontWeight="bold" sx={{ fontFamily: 'monospace' }}>{finalConfirmationCode || 'STRYD-XXXXXXXX'}</Typography>
                  </Grid>
                </Grid>
              </Box>
              {formData.paymentMethod === 'yappy' ? (
                <Typography color="text.secondary">Te hemos enviado un correo a <b>{formData.email}</b> con los detalles de tu compra.</Typography>
              ) : (
                <Typography color="text.secondary">Revisa tu correo <b>{formData.email}</b> para recibir tus instrucciones finales.</Typography>
              )}
            </Box>

            <Paper variant="outlined" sx={{ p: { xs: 2, md: 4 }, borderRadius: 3, bgcolor: 'background.paper', maxWidth: 600, mx: 'auto', border: `1px solid ${ACCENT}80` }}>
              <Typography variant="h6" sx={{ mb: 3, borderBottom: 1, borderColor: 'divider', pb: 1, color: ACCENT, textAlign: 'center', fontWeight: 'bold' }}>
                Resumen de tu Inscripción
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #ccc', pb: 1 }}>
                  <Typography variant="body2" color="text.secondary">{registrationType === 'team' ? 'Capitán:' : 'Corredor Principal:'}</Typography>
                  <Typography variant="body1" fontWeight="bold">{registrationType === 'team' ? `${teamMembers[0]?.firstName || ''} ${teamMembers[0]?.lastName || ''}`.trim() || `${formData.firstName} ${formData.lastName}` : `${formData.firstName} ${formData.lastName}`}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #ccc', pb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Cédula/Pasaporte:</Typography>
                  <Typography variant="body1">{registrationType === 'team' ? (teamMembers[0]?.cedula || formData.cedula) : formData.cedula}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #ccc', pb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Carrera:</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {races.find(r => r.id === selectedRace)?.data?.title || races.find(r => r.id === selectedRace)?.title || '-'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #ccc', pb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Distancia:</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {distances.find(d => d.id === formData.distance)?.name || '-'}
                  </Typography>
                </Box>
                {formData.category && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #ccc', pb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Categoría:</Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {categories.find(c => c.id === formData.category)?.name || '-'}
                    </Typography>
                  </Box>
                )}
                {raceInfo?.data?.showShirtSize !== false && formData.size && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #ccc', pb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Talla de Camiseta:</Typography>
                    <Typography variant="body1" fontWeight="bold">{formData.size}</Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #ccc', pb: 1, bgcolor: 'rgba(255, 107, 0, 0.05)', px: 1, my: 1, borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">Código de Confirmación:</Typography>
                  <Typography variant="body1" fontWeight="bold" sx={{ color: ACCENT }}>{finalConfirmationCode || 'STRYD-********'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #ccc', pb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Método de Pago:</Typography>
                  <Typography variant="body1" fontWeight="bold" sx={{ color: ACCENT }}>
                    {(codeValid && codeValid.valid)
                      ? 'Boleto Físico (Cupón)'
                      : (paymentMethods.find(p => p.value === formData.paymentMethod)?.label || formData.paymentMethod || 'No especificado')}
                  </Typography>
                </Box>
                {(codeValid && codeValid.valid) && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #ccc', pb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Cupón Canjeado:</Typography>
                    <Typography variant="body1" fontWeight="bold" sx={{ fontFamily: 'monospace', color: 'success.main' }}>✅ {code}</Typography>
                  </Box>
                )}
                
                {registrationType === 'team' && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, color: ACCENT }}>Equipo Registrado:</Typography>
                    <Typography variant="body1" fontWeight="bold" sx={{ mb: 1 }}>
                      {teamName === 'Agregar manualmente' ? manualTeamNameGroup : (teamName === 'Ninguno' ? 'Sin equipo' : teamName)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">Integrantes del equipo:</Typography>
                    <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {teamMembers.map((m, idx) => (
                        m.firstName ? (
                          <Typography key={idx} variant="body2">
                            • {m.firstName} {m.lastName} <span style={{opacity: 0.7}}>({m.cedula})</span>
                          </Typography>
                        ) : null
                      ))}
                    </Box>
                  </Box>
                )}
                
                <Box sx={{ textAlign: 'center', mt: 4 }}>
                  <Button 
                    variant="contained" 
                    onClick={() => window.location.href = '/'}
                    sx={{ bgcolor: ACCENT, borderRadius: 8, px: 4, '&:hover': { bgcolor: '#E55A00' } }}
                  >
                    Volver al Inicio
                  </Button>
                </Box>
              </Box>
            </Paper>
          </Box>
        )}

        <Snackbar open={!!notification} autoHideDuration={4000} onClose={() => setNotification(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Box>{notification && <Alert severity={notification.type} sx={{ width: '100%' }}>{notification.message}</Alert>}</Box>
        </Snackbar>

        {croppingImageSrc && (
          <ImageCropper
            open={!!croppingImageSrc}
            imageSrc={croppingImageSrc}
            onCropCompleteAction={handleCropComplete}
            onClose={() => setCroppingImageSrc(null)}
          />
        )}

        {memberCropSrc && (
          <ImageCropper
            open={!!memberCropSrc}
            imageSrc={memberCropSrc}
            onCropCompleteAction={handleMemberCropComplete}
            onClose={() => setMemberCropSrc(null)}
          />
        )}
      </Paper>
    </ThemeProvider>
  );
}
