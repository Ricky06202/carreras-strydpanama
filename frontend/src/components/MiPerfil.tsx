'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Box, Typography, TextField, Button, Switch, FormControlLabel,
  Divider, CircularProgress, Alert, Chip, IconButton, Paper,
  ThemeProvider, createTheme, CssBaseline, Tab, Tabs,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import LockIcon from '@mui/icons-material/Lock';
import LoginIcon from '@mui/icons-material/Login';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import ImageCropper from './ImageCropper';
import { parseSafe } from '../lib/runner-utils';

const ACCENT = '#FF6B00';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: ACCENT },
    background: { default: '#0f0f0f', paper: '#1a1a1a' },
  },
});

const SESSION_KEY = 'stryd_profile_token';

interface PR { distance: string; time: string; date: string; }
interface FavoriteRace { name: string; year: string; time: string; }
interface PlannedRace { name: string; date: string; }

interface RunnerProfile {
  id: string;
  collectionId: string;
  cedula: string;
  firstName: string;
  lastName: string;
  email: string;
  photoUrl: string;
  bio: string;
  publicProfile: boolean;
  publicFields: string;
  instagram: string;
  strava: string;
  facebook: string;
  tiktok: string;
  bannerUrl: string;
  galleryPhotos: string;
  personalRecords: string;
  favoriteRaces: string;
  plannedRaces: string;
  gearWatch: string;
  gearShoes: string;
  gearElectrolyte: string;
  gearOther: string;
  totalRaces: number;
  passwordHash?: string;
}

// ─── Auth screens ─────────────────────────────────────────────────────────────

function SetupScreen({ onSuccess }: { onSuccess: (token: string, runner: RunnerProfile) => void }) {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return; }
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/profile-setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), password }),
      });
      const data = await res.json();
      if (!data.ok) { setError(data.error); return; }
      localStorage.setItem(SESSION_KEY, data.sessionToken);
      onSuccess(data.sessionToken, data.runner);
    } catch { setError('Error de conexión'); }
    finally { setLoading(false); }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Ingresa tu código de confirmación (correo de inscripción) y crea tu contraseña.
      </Typography>
      <TextField
        label="Código de Confirmación"
        placeholder="STRYD-XXXXXXXX"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        inputProps={{ style: { letterSpacing: '0.1em', fontWeight: 'bold' } }}
      />
      <TextField
        label="Contraseña"
        type="password"
        placeholder="Mínimo 8 caracteres"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <TextField
        label="Confirmar Contraseña"
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
      />
      {error && <Alert severity="error">{error}</Alert>}
      <Button
        variant="contained"
        onClick={handleSubmit}
        disabled={loading || !code.trim() || !password || !confirm}
        startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <LockIcon />}
        sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#E55A00' }, py: 1.5, fontWeight: 'bold' }}
      >
        {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
      </Button>
    </Box>
  );
}

function LoginScreen({ onSuccess }: { onSuccess: (token: string, runner: RunnerProfile) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/profile-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!data.ok) { setError(data.error); return; }
      localStorage.setItem(SESSION_KEY, data.sessionToken);
      onSuccess(data.sessionToken, data.runner);
    } catch { setError('Error de conexión'); }
    finally { setLoading(false); }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Ingresa el email con el que te inscribiste y tu contraseña.
      </Typography>
      <TextField
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <TextField
        label="Contraseña"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
      />
      {error && <Alert severity="error">{error}</Alert>}
      <Button
        variant="contained"
        onClick={handleSubmit}
        disabled={loading || !email.trim() || !password}
        startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <LoginIcon />}
        sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#E55A00' }, py: 1.5, fontWeight: 'bold' }}
      >
        {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
      </Button>
    </Box>
  );
}

// ─── Shared sx constants ──────────────────────────────────────────────────────

const sectionSx = { bgcolor: '#1a1a1a', borderRadius: 3, p: 3, mb: 3 };
const labelSx = { color: ACCENT, fontWeight: 'bold', mb: 2, display: 'block' };

// ─── Main component ───────────────────────────────────────────────────────────

export default function MiPerfil() {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [runner, setRunner] = useState<RunnerProfile | null>(null);
  const [authTab, setAuthTab] = useState(0); // 0=login, 1=setup
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Profile fields
  const [bio, setBio] = useState('');
  const [publicProfile, setPublicProfile] = useState(false);
  const [publicFields, setPublicFields] = useState({ bio: true, records: true, gear: true, races: true, gallery: true, social: true });
  const [instagram, setInstagram] = useState('');
  const [strava, setStrava] = useState('');
  const [facebook, setFacebook] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [gearWatch, setGearWatch] = useState('');
  const [gearShoes, setGearShoes] = useState('');
  const [gearElectrolyte, setGearElectrolyte] = useState('');
  const [gearOther, setGearOther] = useState('');
  const [prs, setPrs] = useState<PR[]>([{ distance: '', time: '', date: '' }]);
  const [favoriteRaces, setFavoriteRaces] = useState<FavoriteRace[]>([{ name: '', year: '', time: '' }]);
  const [plannedRaces, setPlannedRaces] = useState<PlannedRace[]>([{ name: '', date: '' }]);
  const [gallery, setGallery] = useState<string[]>([]);
  const [photoPreview, setPhotoPreview] = useState('');
  const [bannerPreview, setBannerPreview] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [crop, setCrop] = useState<{ src: string | null; type: 'profile' | 'banner' | 'gallery' }>({ src: null, type: 'profile' });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Restore session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return;
    fetch('/api/profile-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // profile-auth accepts sessionToken too — we'll add that support below
      body: JSON.stringify({ sessionToken: stored }),
    }).then(r => r.json()).then(data => {
      if (data.ok) loadRunnerIntoState(data.runner, stored);
      else localStorage.removeItem(SESSION_KEY);
    }).catch(() => {});
  }, []);

  const loadRunnerIntoState = (r: RunnerProfile, token: string) => {
    setSessionToken(token);
    setRunner(r);
    setBio(r.bio || '');
    setPublicProfile(r.publicProfile || false);
    setPublicFields(parseSafe(r.publicFields, { bio: true, records: true, gear: true, races: true, gallery: true, social: true }));
    setInstagram(r.instagram || '');
    setStrava(r.strava || '');
    setFacebook(r.facebook || '');
    setTiktok(r.tiktok || '');
    setGearWatch(r.gearWatch || '');
    setGearShoes(r.gearShoes || '');
    setGearElectrolyte(r.gearElectrolyte || '');
    setGearOther(r.gearOther || '');
    setPrs(parseSafe<PR[]>(r.personalRecords, [{ distance: '', time: '', date: '' }]));
    setFavoriteRaces(parseSafe<FavoriteRace[]>(r.favoriteRaces, [{ name: '', year: '', time: '' }]));
    setPlannedRaces(parseSafe<PlannedRace[]>(r.plannedRaces, [{ name: '', date: '' }]));
    setGallery(parseSafe<string[]>(r.galleryPhotos, []));
    setPhotoPreview(r.photoUrl || '');
    setBannerPreview(r.bannerUrl || '');
  };

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setSessionToken(null);
    setRunner(null);
  };

  const handleSave = async () => {
    if (!sessionToken) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/profile-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken,
          updates: {
            bio,
            publicProfile,
            publicFields: JSON.stringify(publicFields),
            instagram, strava, facebook, tiktok,
            gearWatch, gearShoes, gearElectrolyte, gearOther,
            personalRecords: JSON.stringify(prs.filter(p => p.distance)),
            favoriteRaces: JSON.stringify(favoriteRaces.filter(f => f.name)),
            plannedRaces: JSON.stringify(plannedRaces.filter(p => p.name)),
          },
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setSuccess('¡Perfil guardado exitosamente!');
    } catch (e: any) {
      setError(e.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (type: 'profile' | 'banner' | 'gallery') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = () => setCrop({ src: reader.result as string, type });
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedBase64: string) => {
    const { type } = crop;
    setCrop(c => ({ ...c, src: null }));
    setUploadingPhoto(true);
    try {
      const res = await fetch('/api/profile-upload-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken, imageBase64: croppedBase64, type }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      if (type === 'profile') setPhotoPreview(data.url);
      else if (type === 'banner') setBannerPreview(data.url);
      else setGallery(prev => [...prev, data.url]);
      setSuccess('Foto subida correctamente');
    } catch (e: any) {
      setError(e.message || 'Error al subir foto');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removeGalleryPhoto = async (url: string) => {
    const updated = gallery.filter(u => u !== url);
    setGallery(updated);
    fetch('/api/profile-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken, updates: { galleryPhotos: JSON.stringify(updated) } }),
    });
  };

  // ── Auth gate ────────────────────────────────────────────────────────────────
  if (!runner) {
    return (
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <Box sx={{ minHeight: '100vh', bgcolor: '#0f0f0f', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2 }}>
          <Paper sx={{ p: { xs: 3, sm: 5 }, maxWidth: 480, width: '100%', bgcolor: '#1a1a1a', borderRadius: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Box sx={{ width: 72, height: 72, bgcolor: ACCENT, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                <PersonIcon sx={{ fontSize: 40, color: 'white' }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 900, color: 'white' }}>Mi Perfil de Atleta</Typography>
            </Box>

            <Tabs
              value={authTab}
              onChange={(_, v) => setAuthTab(v)}
              sx={{ mb: 3, '& .MuiTab-root': { color: 'text.secondary' }, '& .Mui-selected': { color: ACCENT }, '& .MuiTabs-indicator': { bgcolor: ACCENT } }}
            >
              <Tab label="Iniciar Sesión" />
              <Tab label="Primera Vez (crear cuenta)" />
            </Tabs>

            {authTab === 0
              ? <LoginScreen onSuccess={loadRunnerIntoState} />
              : <SetupScreen onSuccess={loadRunnerIntoState} />
            }
          </Paper>
        </Box>
      </ThemeProvider>
    );
  }

  // ── Editor ───────────────────────────────────────────────────────────────────
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: '#0f0f0f' }}>

        {/* Banner */}
        <Box sx={{
          height: { xs: 160, sm: 220 },
          background: bannerPreview ? `url(${bannerPreview}) center/cover no-repeat` : 'linear-gradient(135deg, #1a1a1a 0%, #2d1a0a 100%)',
          position: 'relative',
        }}>
          <Button
            size="small"
            variant="contained"
            onClick={() => bannerInputRef.current?.click()}
            sx={{ position: 'absolute', bottom: 12, right: 12, bgcolor: 'rgba(0,0,0,0.7)', '&:hover': { bgcolor: ACCENT }, fontSize: '0.7rem' }}
          >
            {bannerPreview ? 'Cambiar portada' : '+ Subir portada'}
          </Button>
          <input ref={bannerInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileSelect('banner')} />
        </Box>

        <Box sx={{ maxWidth: 760, mx: 'auto', px: { xs: 2, sm: 3 }, pb: 8 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2, mt: -5, mb: 3 }}>
            <Box sx={{ position: 'relative', flexShrink: 0 }}>
              <Box sx={{
                width: { xs: 80, sm: 100 }, height: { xs: 80, sm: 100 }, borderRadius: '50%',
                border: `4px solid ${ACCENT}`, overflow: 'hidden', bgcolor: '#2d2d2d',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {photoPreview
                  ? <img src={photoPreview} alt="perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <PersonIcon sx={{ fontSize: 48, color: '#555' }} />
                }
              </Box>
              <IconButton
                size="small"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                sx={{ position: 'absolute', bottom: 0, right: 0, bgcolor: ACCENT, '&:hover': { bgcolor: '#E55A00' }, width: 28, height: 28 }}
              >
                {uploadingPhoto ? <CircularProgress size={14} color="inherit" /> : <span style={{ fontSize: 14 }}>✏️</span>}
              </IconButton>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileSelect('profile')} />
            </Box>
            <Box sx={{ flex: 1, pb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 900, color: 'white', lineHeight: 1.2 }}>
                {runner.firstName} {runner.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary">{runner.totalRaces || 0} carreras completadas</Typography>
            </Box>
            <Button
              size="small"
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
              sx={{ color: 'text.secondary', mb: 1, '&:hover': { color: 'error.main' } }}
            >
              Salir
            </Button>
          </Box>

          {/* Top Feedback Messages */}

          {/* Visibilidad */}
          <Box sx={sectionSx}>
            <Typography sx={labelSx}>🌐 Visibilidad del Perfil</Typography>
            <FormControlLabel
              control={<Switch checked={publicProfile} onChange={(e) => setPublicProfile(e.target.checked)} sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: ACCENT }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: ACCENT } }} />}
              label={
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                    {publicProfile ? '✅ Perfil público activado' : 'Perfil oculto'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {publicProfile ? 'Tu perfil aparece en la sección /atletas' : 'Solo tú puedes ver tu perfil'}
                  </Typography>
                </Box>
              }
            />
            {publicProfile && (
              <Box sx={{ mt: 2, pl: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>¿Qué deseas mostrar públicamente?</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {([
                    { key: 'bio', label: 'Bio' },
                    { key: 'records', label: 'Marcas Personales' },
                    { key: 'gear', label: 'Mi Gear' },
                    { key: 'races', label: 'Carreras' },
                    { key: 'gallery', label: 'Galería' },
                    { key: 'social', label: 'Redes Sociales' },
                  ] as const).map(({ key, label }) => (
                    <Chip
                      key={key}
                      label={label}
                      clickable
                      onClick={() => setPublicFields(prev => ({ ...prev, [key]: !prev[key] }))}
                      sx={{
                        bgcolor: publicFields[key] ? ACCENT : '#2d2d2d',
                        color: 'white',
                        fontWeight: 'bold',
                        '&:hover': { bgcolor: publicFields[key] ? '#E55A00' : '#3d3d3d' },
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Box>

          {/* Bio */}
          <Box sx={sectionSx}>
            <Typography sx={labelSx}>✍️ Mi Bio como Corredor</Typography>
            <TextField
              fullWidth multiline rows={4}
              placeholder="Cuéntale a la comunidad quién eres como corredor..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              inputProps={{ maxLength: 600 }}
              helperText={`${bio.length}/600`}
            />
          </Box>

          {/* Redes */}
          <Box sx={sectionSx}>
            <Typography sx={labelSx}>📱 Redes Sociales</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField label="Instagram" placeholder="@usuario" value={instagram} onChange={(e) => setInstagram(e.target.value)} InputProps={{ startAdornment: <span style={{ marginRight: 8 }}>📸</span> }} />
              <TextField label="Strava" placeholder="URL o usuario" value={strava} onChange={(e) => setStrava(e.target.value)} InputProps={{ startAdornment: <span style={{ marginRight: 8 }}>🏃</span> }} />
              <TextField label="Facebook" placeholder="@usuario" value={facebook} onChange={(e) => setFacebook(e.target.value)} InputProps={{ startAdornment: <span style={{ marginRight: 8 }}>👥</span> }} />
              <TextField label="TikTok" placeholder="@usuario" value={tiktok} onChange={(e) => setTiktok(e.target.value)} InputProps={{ startAdornment: <span style={{ marginRight: 8 }}>🎵</span> }} />
            </Box>
          </Box>

          {/* PRs */}
          <Box sx={sectionSx}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography sx={{ ...labelSx, mb: 0 }}>🏅 Mis Marcas Personales (PRs)</Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={() => setPrs(p => [...p, { distance: '', time: '', date: '' }])} sx={{ color: ACCENT }}>Agregar</Button>
            </Box>
            {prs.map((pr, i) => (
              <Box key={i} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '2fr 2fr 2fr auto' }, gap: 1.5, mb: 1.5, alignItems: 'center' }}>
                <TextField size="small" label="Distancia" placeholder="5K" value={pr.distance} onChange={(e) => setPrs(p => p.map((x, j) => j === i ? { ...x, distance: e.target.value } : x))} />
                <TextField size="small" label="Tiempo" placeholder="25:30" value={pr.time} onChange={(e) => setPrs(p => p.map((x, j) => j === i ? { ...x, time: e.target.value } : x))} />
                <TextField size="small" type="date" InputLabelProps={{ shrink: true }} label="Fecha" placeholder="2025-01-01" value={pr.date} onChange={(e) => setPrs(p => p.map((x, j) => j === i ? { ...x, date: e.target.value } : x))} />
                <IconButton size="small" onClick={() => setPrs(p => p.filter((_, j) => j !== i))} sx={{ color: 'error.main' }}><DeleteIcon fontSize="small" /></IconButton>
              </Box>
            ))}
          </Box>

          {/* Carreras destacadas */}
          <Box sx={sectionSx}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography sx={{ ...labelSx, mb: 0 }}>🌎 Carreras Destacadas</Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={() => setFavoriteRaces(f => [...f, { name: '', year: '', time: '' }])} sx={{ color: ACCENT }}>Agregar</Button>
            </Box>
            {favoriteRaces.map((race, i) => (
              <Box key={i} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '3fr 1fr 2fr auto' }, gap: 1.5, mb: 1.5, alignItems: 'center' }}>
                <TextField size="small" label="Nombre" placeholder="Boston Marathon" value={race.name} onChange={(e) => setFavoriteRaces(f => f.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                <TextField size="small" label="Año" placeholder="2024" value={race.year} onChange={(e) => setFavoriteRaces(f => f.map((x, j) => j === i ? { ...x, year: e.target.value } : x))} />
                <TextField size="small" label="Tiempo" placeholder="3:45:00" value={race.time} onChange={(e) => setFavoriteRaces(f => f.map((x, j) => j === i ? { ...x, time: e.target.value } : x))} />
                <IconButton size="small" onClick={() => setFavoriteRaces(f => f.filter((_, j) => j !== i))} sx={{ color: 'error.main' }}><DeleteIcon fontSize="small" /></IconButton>
              </Box>
            ))}
          </Box>

          {/* Próximas carreras */}
          <Box sx={sectionSx}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography sx={{ ...labelSx, mb: 0 }}>📅 Próximas Carreras</Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={() => setPlannedRaces(p => [...p, { name: '', date: '' }])} sx={{ color: ACCENT }}>Agregar</Button>
            </Box>
            {plannedRaces.map((race, i) => (
              <Box key={i} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '3fr 2fr auto' }, gap: 1.5, mb: 1.5, alignItems: 'center' }}>
                <TextField size="small" label="Nombre" placeholder="Carrera STRYD 2026" value={race.name} onChange={(e) => setPlannedRaces(p => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                <TextField size="small" type="date" InputLabelProps={{ shrink: true }} label="Fecha" placeholder="2026-06-15" value={race.date} onChange={(e) => setPlannedRaces(p => p.map((x, j) => j === i ? { ...x, date: e.target.value } : x))} />
                <IconButton size="small" onClick={() => setPlannedRaces(p => p.filter((_, j) => j !== i))} sx={{ color: 'error.main' }}><DeleteIcon fontSize="small" /></IconButton>
              </Box>
            ))}
          </Box>

          {/* Gear */}
          <Box sx={sectionSx}>
            <Typography sx={labelSx}>⌚ Mi Equipo Favorito</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField label="Reloj GPS" placeholder="Garmin Forerunner 965" value={gearWatch} onChange={(e) => setGearWatch(e.target.value)} InputProps={{ startAdornment: <span style={{ marginRight: 8 }}>⌚</span> }} />
              <TextField label="Zapatillas" placeholder="Nike Alphafly 3" value={gearShoes} onChange={(e) => setGearShoes(e.target.value)} InputProps={{ startAdornment: <span style={{ marginRight: 8 }}>👟</span> }} />
              <TextField label="Nutrición / Electrolitos" placeholder="Maurten Gel 100" value={gearElectrolyte} onChange={(e) => setGearElectrolyte(e.target.value)} InputProps={{ startAdornment: <span style={{ marginRight: 8 }}>💧</span> }} />
              <TextField label="Otro equipo" placeholder="Vest Salomon 12L" value={gearOther} onChange={(e) => setGearOther(e.target.value)} InputProps={{ startAdornment: <span style={{ marginRight: 8 }}>🎽</span> }} />
            </Box>
          </Box>

          {/* Galería */}
          <Box sx={sectionSx}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography sx={{ ...labelSx, mb: 0 }}>📷 Mis Mejores Fotos</Typography>
              <Button size="small" startIcon={uploadingPhoto ? <CircularProgress size={14} color="inherit" /> : <AddIcon />}
                onClick={() => galleryInputRef.current?.click()} disabled={uploadingPhoto} sx={{ color: ACCENT }}>
                Subir Foto
              </Button>
              <input ref={galleryInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileSelect('gallery')} />
            </Box>
            {gallery.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3, border: '1px dashed #444', borderRadius: 2 }}>
                Agrega fotos de tus mejores momentos corriendo
              </Typography>
            )}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' }, gap: 1.5 }}>
              {gallery.map((url, i) => (
                <Box key={i} sx={{ position: 'relative', paddingTop: '100%', borderRadius: 2, overflow: 'hidden', bgcolor: '#2d2d2d' }}>
                  <img src={url} alt={`foto ${i + 1}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  <IconButton size="small" onClick={() => removeGalleryPhoto(url)}
                    sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.7)', color: 'white', '&:hover': { bgcolor: 'red' } }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

          <Button
            fullWidth variant="contained" onClick={handleSave} disabled={loading}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#E55A00' }, py: 1.8, fontWeight: 'bold', fontSize: '1.1rem', borderRadius: 3 }}
          >
            {loading ? 'Guardando...' : 'Guardar Perfil'}
          </Button>

          {runner && publicProfile && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Tu perfil público:{' '}
                <a href={`/atletas/${runner.cedula}`} style={{ color: ACCENT }} target="_blank" rel="noreferrer">
                  /atletas/{runner.cedula}
                </a>
              </Typography>
            </Box>
          )}
        </Box>

        <ImageCropper
          open={!!crop.src}
          imageSrc={crop.src}
          onClose={() => setCrop(c => ({ ...c, src: null }))}
          onCropCompleteAction={handleCropComplete}
        />
      </Box>
    </ThemeProvider>
  );
}
