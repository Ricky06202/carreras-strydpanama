'use client';

import React, { useState, useMemo } from 'react';
import {
  Box, Typography, TextField, InputAdornment, ThemeProvider, createTheme, CssBaseline,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

const ACCENT = '#FF6B00';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: ACCENT },
    background: { default: '#0f0f0f', paper: '#1a1a1a' },
  },
});

function parseSafe<T>(str: string, fallback: T): T {
  try { return str ? JSON.parse(str) : fallback; } catch { return fallback; }
}

const flagMap: Record<string, string> = {
  'Panamá': '🇵🇦', 'Costa Rica': '🇨🇷', 'Colombia': '🇨🇴', 'Venezuela': '🇻🇪',
  'Estados Unidos': '🇺🇸', 'México': '🇲🇽', 'Argentina': '🇦🇷', 'España': '🇪🇸',
  'Chile': '🇨🇱', 'Perú': '🇵🇪', 'Ecuador': '🇪🇨', 'Guatemala': '🇬🇹',
  'Honduras': '🇭🇳', 'Nicaragua': '🇳🇮', 'El Salvador': '🇸🇻', 'Brasil': '🇧🇷',
  'Uruguay': '🇺🇾', 'Paraguay': '🇵🇾', 'Bolivia': '🇧🇴', 'Canadá': '🇨🇦',
};

interface RunnerData {
  id: string;
  cedula: string;
  firstName: string;
  lastName: string;
  photoUrl: string;
  country: string;
  totalRaces: number;
  bio: string;
  personalRecords: string;
  instagram: string;
  strava: string;
  facebook: string;
  tiktok: string;
  publicFields: string;
}

export default function AtletasPage({ initialAtletas = [] }: { initialAtletas: RunnerData[] }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return initialAtletas;
    const q = search.toLowerCase();
    return initialAtletas.filter(r =>
      `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) ||
      (r.country || '').toLowerCase().includes(q)
    );
  }, [search, initialAtletas]);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: '#0f0f0f' }}>

        {/* Hero */}
        <Box sx={{
          background: 'linear-gradient(135deg, #000000 0%, #1a0a00 50%, #0f0f0f 100%)',
          py: { xs: 6, sm: 10 },
          px: 2,
          textAlign: 'center',
          borderBottom: `1px solid ${ACCENT}33`,
        }}>
          <Typography
            variant="overline"
            sx={{ color: ACCENT, fontWeight: 'bold', letterSpacing: '0.3em', display: 'block', mb: 1 }}
          >
            STRYD PANAMA
          </Typography>
          <Typography
            variant="h3"
            sx={{ fontWeight: 900, color: 'white', mb: 2, fontSize: { xs: '2rem', sm: '2.8rem' } }}
          >
            Comunidad de{' '}
            <Box component="span" sx={{ color: ACCENT }}>Atletas</Box>
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 520, mx: 'auto', mb: 4 }}>
            Corredores que comparten su pasión, sus marcas y su historia. Únete a la comunidad activando tu perfil.
          </Typography>

          <TextField
            placeholder="Buscar atleta por nombre o país..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{
              maxWidth: 460, width: '100%',
              '& .MuiOutlinedInput-root': {
                bgcolor: '#1a1a1a',
                borderRadius: 3,
                '& fieldset': { borderColor: '#333' },
                '&:hover fieldset': { borderColor: ACCENT },
                '&.Mui-focused fieldset': { borderColor: ACCENT },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* Grid */}
        <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, sm: 3 }, py: { xs: 4, sm: 6 } }}>
          {filtered.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 10 }}>
              <Typography variant="h6" color="text.secondary">
                {search ? 'No encontramos atletas con ese nombre.' : 'Aún no hay atletas públicos. ¡Sé el primero en activar tu perfil!'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                <a href="/mi-perfil" style={{ color: ACCENT }}>Activa tu perfil en /mi-perfil</a>
              </Typography>
            </Box>
          ) : (
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' },
              gap: { xs: 2, sm: 3 },
            }}>
              {filtered.map((runner) => {
                const prs = parseSafe<Array<{distance: string; time: string}>>(runner.personalRecords, []);
                const topPr = prs[0];
                const flag = flagMap[runner.country] || '🌍';
                const pf = parseSafe<Record<string, boolean>>(runner.publicFields, {});

                return (
                  <a key={runner.id} href={`/atletas/${encodeURIComponent(runner.cedula)}`} style={{ textDecoration: 'none' }}>
                    <Box sx={{
                      bgcolor: '#1a1a1a',
                      borderRadius: 3,
                      overflow: 'hidden',
                      border: '1px solid #2d2d2d',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        border: `1px solid ${ACCENT}`,
                        transform: 'translateY(-4px)',
                        boxShadow: `0 8px 32px ${ACCENT}22`,
                      },
                    }}>
                      {/* Foto */}
                      <Box sx={{ position: 'relative', paddingTop: '100%', bgcolor: '#2d2d2d' }}>
                        {runner.photoUrl
                          ? <img src={runner.photoUrl} alt={runner.firstName} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                          : (
                            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Typography sx={{ fontSize: { xs: '2.5rem', sm: '3.5rem' } }}>🏃</Typography>
                            </Box>
                          )
                        }
                        {/* Badge de carreras */}
                        {runner.totalRaces > 0 && (
                          <Box sx={{
                            position: 'absolute', top: 8, right: 8,
                            bgcolor: ACCENT, color: 'white', borderRadius: 2,
                            px: 1, py: 0.3, fontSize: { xs: '0.6rem', sm: '0.65rem' }, fontWeight: 'bold',
                          }}>
                            {runner.totalRaces} 🏅
                          </Box>
                        )}
                      </Box>

                      {/* Info */}
                      <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
                        <Typography sx={{ fontWeight: 700, color: 'white', fontSize: { xs: '0.85rem', sm: '0.95rem' }, lineHeight: 1.3, mb: 0.5 }}>
                          {runner.firstName} {runner.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                          {flag} {runner.country}
                        </Typography>

                        {topPr && pf.records !== false && (
                          <Box sx={{ bgcolor: `${ACCENT}15`, border: `1px solid ${ACCENT}33`, borderRadius: 1.5, px: 1, py: 0.5, mb: 1 }}>
                            <Typography sx={{ fontSize: '0.65rem', color: ACCENT, fontWeight: 'bold' }}>
                              🏅 {topPr.distance}: {topPr.time}
                            </Typography>
                          </Box>
                        )}

                        {/* Redes sociales */}
                        {pf.social !== false && (
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {runner.instagram && <Typography sx={{ fontSize: '0.9rem' }} title="Instagram">📸</Typography>}
                            {runner.strava && <Typography sx={{ fontSize: '0.9rem' }} title="Strava">🏃</Typography>}
                            {runner.facebook && <Typography sx={{ fontSize: '0.9rem' }} title="Facebook">👥</Typography>}
                            {runner.tiktok && <Typography sx={{ fontSize: '0.9rem' }} title="TikTok">🎵</Typography>}
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </a>
                );
              })}
            </Box>
          )}

          {filtered.length > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
              {filtered.length} atleta{filtered.length !== 1 ? 's' : ''} en la comunidad
            </Typography>
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
}
