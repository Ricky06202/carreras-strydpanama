'use client';

import React, { useState } from 'react';
import { Box, Typography, ThemeProvider, createTheme, CssBaseline, Chip, Divider } from '@mui/material';

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
  'Canadá': '🇨🇦',
};

interface Runner {
  id: string;
  cedula: string;
  firstName: string;
  lastName: string;
  photoUrl: string;
  bannerUrl: string;
  country: string;
  totalRaces: number;
  bio: string;
  personalRecords: string;
  favoriteRaces: string;
  plannedRaces: string;
  instagram: string;
  strava: string;
  facebook: string;
  tiktok: string;
  gearWatch: string;
  gearShoes: string;
  gearElectrolyte: string;
  gearOther: string;
  galleryPhotos: string;
  publicFields: string;
}

export default function AtletaProfile({ runner }: { runner: Runner }) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const pf = parseSafe<Record<string, boolean>>(runner.publicFields, {
    bio: true, records: true, gear: true, races: true, gallery: true, social: true,
  });
  const prs = parseSafe<Array<{distance: string; time: string; date: string}>>(runner.personalRecords, []);
  const favorites = parseSafe<Array<{name: string; year: string; time: string}>>(runner.favoriteRaces, []);
  const planned = parseSafe<Array<{name: string; date: string}>>(runner.plannedRaces, []);
  const gallery = parseSafe<string[]>(runner.galleryPhotos, []);
  const flag = flagMap[runner.country] || '🌍';

  const hasSocial = (pf.social !== false) && (runner.instagram || runner.strava || runner.facebook || runner.tiktok);
  const hasGear = (pf.gear !== false) && (runner.gearWatch || runner.gearShoes || runner.gearElectrolyte || runner.gearOther);
  const hasPrs = (pf.records !== false) && prs.length > 0;
  const hasFavorites = (pf.races !== false) && favorites.length > 0;
  const hasPlanned = (pf.races !== false) && planned.length > 0;
  const hasGallery = (pf.gallery !== false) && gallery.length > 0;

  const cardSx = { bgcolor: '#1a1a1a', borderRadius: 3, p: { xs: 2.5, sm: 3 }, mb: 3 };
  const titleSx = { color: ACCENT, fontWeight: 800, mb: 2, fontSize: { xs: '1rem', sm: '1.1rem' } };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: '#0f0f0f' }}>

        {/* Banner + Hero */}
        <Box sx={{
          background: runner.bannerUrl
            ? `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(15,15,15,1)), url(${runner.bannerUrl}) center/cover no-repeat`
            : 'linear-gradient(135deg, #000000 0%, #2d1a00 50%, #0f0f0f 100%)',
          pt: { xs: 6, sm: 10 },
          pb: { xs: 4, sm: 6 },
          px: 2,
        }}>
          <Box sx={{ maxWidth: 760, mx: 'auto', display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'center', sm: 'flex-end' }, gap: 3 }}>
            {/* Foto circular */}
            <Box sx={{
              width: { xs: 100, sm: 130 }, height: { xs: 100, sm: 130 }, borderRadius: '50%',
              border: `4px solid ${ACCENT}`, overflow: 'hidden', flexShrink: 0,
              bgcolor: '#2d2d2d', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {runner.photoUrl
                ? <img src={runner.photoUrl} alt={runner.firstName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <Typography sx={{ fontSize: '3rem' }}>🏃</Typography>
              }
            </Box>

            <Box sx={{ textAlign: { xs: 'center', sm: 'left' }, flex: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 900, color: 'white', lineHeight: 1.2, mb: 0.5, fontSize: { xs: '1.6rem', sm: '2.2rem' } }}>
                {runner.firstName} {runner.lastName}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {flag} {runner.country}
              </Typography>
              {runner.totalRaces > 0 && (
                <Chip label={`🏅 ${runner.totalRaces} carrera${runner.totalRaces !== 1 ? 's' : ''} completada${runner.totalRaces !== 1 ? 's' : ''}`}
                  sx={{ mt: 1, bgcolor: `${ACCENT}20`, color: ACCENT, fontWeight: 'bold', border: `1px solid ${ACCENT}40` }}
                />
              )}
            </Box>
          </Box>
        </Box>

        <Box sx={{ maxWidth: 760, mx: 'auto', px: { xs: 2, sm: 3 }, py: { xs: 3, sm: 4 } }}>

          {/* Redes sociales */}
          {hasSocial && (
            <Box sx={{ ...cardSx, display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
              {runner.instagram && (
                <a href={`https://instagram.com/${runner.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                  <Chip icon={<span>📸</span>} label={runner.instagram} clickable sx={{ bgcolor: '#2d2d2d', color: 'white', '&:hover': { bgcolor: ACCENT } }} />
                </a>
              )}
              {runner.strava && (
                <a href={runner.strava.startsWith('http') ? runner.strava : `https://strava.com/athletes/${runner.strava}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                  <Chip icon={<span>🏃</span>} label={runner.strava} clickable sx={{ bgcolor: '#2d2d2d', color: 'white', '&:hover': { bgcolor: ACCENT } }} />
                </a>
              )}
              {runner.facebook && (
                <a href={`https://facebook.com/${runner.facebook.replace('@', '')}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                  <Chip icon={<span>👥</span>} label={runner.facebook} clickable sx={{ bgcolor: '#2d2d2d', color: 'white', '&:hover': { bgcolor: ACCENT } }} />
                </a>
              )}
              {runner.tiktok && (
                <a href={`https://tiktok.com/${runner.tiktok.replace('@', '')}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                  <Chip icon={<span>🎵</span>} label={runner.tiktok} clickable sx={{ bgcolor: '#2d2d2d', color: 'white', '&:hover': { bgcolor: ACCENT } }} />
                </a>
              )}
            </Box>
          )}

          {/* Bio */}
          {pf.bio !== false && runner.bio && (
            <Box sx={cardSx}>
              <Typography sx={titleSx}>✍️ Sobre Mí</Typography>
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                {runner.bio}
              </Typography>
            </Box>
          )}

          {/* PRs */}
          {hasPrs && (
            <Box sx={cardSx}>
              <Typography sx={titleSx}>🏅 Marcas Personales</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
                {prs.filter(p => p.distance && p.time).map((pr, i) => (
                  <Box key={i} sx={{ bgcolor: '#0f0f0f', border: `1px solid ${ACCENT}33`, borderRadius: 2, p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.7rem' }}>
                      {pr.distance}
                    </Typography>
                    <Typography sx={{ color: ACCENT, fontWeight: 900, fontSize: { xs: '1.1rem', sm: '1.3rem' } }}>
                      {pr.time}
                    </Typography>
                    {pr.date && <Typography variant="caption" color="text.disabled">{pr.date}</Typography>}
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* Carreras Destacadas */}
          {hasFavorites && (
            <Box sx={cardSx}>
              <Typography sx={titleSx}>🌎 Carreras Destacadas</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {favorites.filter(f => f.name).map((race, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#0f0f0f', borderRadius: 2, px: 2, py: 1.5 }}>
                    <Box>
                      <Typography sx={{ fontWeight: 700, color: 'white', fontSize: '0.95rem' }}>{race.name}</Typography>
                      {race.year && <Typography variant="caption" color="text.secondary">{race.year}</Typography>}
                    </Box>
                    {race.time && (
                      <Typography sx={{ color: ACCENT, fontWeight: 'bold', fontSize: '0.9rem' }}>{race.time}</Typography>
                    )}
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* Próximas Carreras */}
          {hasPlanned && (
            <Box sx={cardSx}>
              <Typography sx={titleSx}>📅 Próximas Carreras</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {planned.filter(p => p.name).map((race, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#0f0f0f', borderRadius: 2, px: 2, py: 1.5 }}>
                    <Typography sx={{ fontWeight: 700, color: 'white', fontSize: '0.95rem' }}>{race.name}</Typography>
                    {race.date && <Typography variant="caption" sx={{ color: ACCENT }}>{race.date}</Typography>}
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* Gear */}
          {hasGear && (
            <Box sx={cardSx}>
              <Typography sx={titleSx}>⌚ Mi Equipo Favorito</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 2 }}>
                {[
                  { icon: '⌚', label: 'Reloj', value: runner.gearWatch },
                  { icon: '👟', label: 'Zapatillas', value: runner.gearShoes },
                  { icon: '💧', label: 'Nutrición', value: runner.gearElectrolyte },
                  { icon: '🎽', label: 'Otro', value: runner.gearOther },
                ].filter(g => g.value).map((gear, i) => (
                  <Box key={i} sx={{ bgcolor: '#0f0f0f', border: '1px solid #2d2d2d', borderRadius: 2, p: 2, textAlign: 'center' }}>
                    <Typography sx={{ fontSize: '1.8rem', mb: 0.5 }}>{gear.icon}</Typography>
                    <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.5 }}>
                      {gear.label}
                    </Typography>
                    <Typography sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.8rem', lineHeight: 1.3 }}>
                      {gear.value}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* Galería */}
          {hasGallery && (
            <Box sx={cardSx}>
              <Typography sx={titleSx}>📷 Galería</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' }, gap: 1.5 }}>
                {gallery.map((url, i) => (
                  <Box
                    key={i}
                    sx={{ position: 'relative', paddingTop: '100%', borderRadius: 2, overflow: 'hidden', cursor: 'pointer', bgcolor: '#2d2d2d',
                      '&:hover img': { transform: 'scale(1.05)' },
                    }}
                    onClick={() => setLightboxSrc(url)}
                  >
                    <img src={url} alt={`foto ${i + 1}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }} />
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          <Divider sx={{ my: 3 }} />
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              ¿Eres corredor? {' '}
              <a href="/mi-perfil" style={{ color: ACCENT, fontWeight: 'bold' }}>Activa tu perfil en /mi-perfil</a>
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              <a href="/atletas" style={{ color: 'text.secondary' }}>← Ver todos los atletas</a>
            </Typography>
          </Box>
        </Box>

        {/* Lightbox */}
        {lightboxSrc && (
          <Box
            onClick={() => setLightboxSrc(null)}
            sx={{
              position: 'fixed', inset: 0, bgcolor: 'rgba(0,0,0,0.92)', zIndex: 9999,
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', p: 2,
            }}
          >
            <img src={lightboxSrc} alt="foto ampliada" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 8, objectFit: 'contain' }} />
          </Box>
        )}
      </Box>
    </ThemeProvider>
  );
}
