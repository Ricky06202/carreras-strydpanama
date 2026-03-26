'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, Button, Card, CardContent, Grid, Container, Chip } from '@mui/material';
import Layout from './Layout';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SpeedIcon from '@mui/icons-material/Speed';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import GroupIcon from '@mui/icons-material/Group';
import InfoIcon from '@mui/icons-material/Info';
import DescriptionIcon from '@mui/icons-material/Description';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import PlaceIcon from '@mui/icons-material/Place';

const ACCENT = '#facc15';

interface Distance {
  id: string;
  name: string;
}

interface Race {
  id: string;
  name: string;
  description: string | null;
  date: string;
  startTime: string | null;
  status: string;
  location: string | null;
  price: number;
  imageUrl: string | null;
  distances: Distance[];
}

function formatDateLong(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-PA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-PA', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const sponsors = [
  'Gatorade', 'Aloe King', 'Agua Cristalina', 'Zepol', 'Red Bull',
  'Detergente 10', 'El Molino Criollo', 'Pasta Dorado', 'Te Hindu',
  'Guandy', 'Xtreme', 'Borden', 'Berard', 'Sushi Express', 'More',
  'Juan Valdez', 'Nutrigel', 'Prestigio', 'Destiny Sport', 'Bacterion'
];

export default function HomePage() {
  const [upcomingRaces, setUpcomingRaces] = useState<Race[]>([]);
  const [completedRaces, setCompletedRaces] = useState<Race[]>([]);

  useEffect(() => {
    fetch('/api/races').then(r => r.json()).then(d => {
      const races = d.races || [];
      setUpcomingRaces(races.filter((r: Race) => r.status === 'accepting'));
      setCompletedRaces(races.filter((r: Race) => r.status === 'completed'));
    }).catch(() => { });
  }, []);

  return (
    <Layout>
      {/* Hero Section */}
      <Box sx={{
        height: { xs: 400, md: 500 },
        background: 'radial-gradient(circle at 50% 10%, #1e3a8a 0%, #020617 100%)',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: { xs: '0 0 32px 32px', md: '32px' },
        mx: { xs: 0, md: 4 },
        mt: { xs: 0, md: 4 },
        mb: { xs: 4, md: 8 },
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
      }}>
        <Box sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url(https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=1600)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.15
        }} />
        <Container maxWidth="lg" sx={{ height: '100%', display: 'flex', alignItems: 'center', position: 'relative' }}>
          <Box>
            <Typography variant="h2" sx={{ fontWeight: 900, color: 'white', mb: 2, fontSize: { xs: '2.5rem', md: '4rem' } }}>
              BIENVENIDO A<br />
              <Box component="span" sx={{ color: 'orange.200' }}>CARRERAS BY STRYD PANAMA</Box>
            </Typography>
            <Typography variant="h5" sx={{ color: 'white', mb: 4, maxWidth: 600 }}>
              Te damos la bienvenida a nuestro sitio web con información sobre los eventos de running que realizamos en Panamá
            </Typography>
            <Button
              href="#proximos-eventos"
              variant="contained"
              size="large"
              sx={{
                bgcolor: 'white',
                color: ACCENT,
                fontWeight: 'bold',
                px: 4,
                py: 1.5,
                '&:hover': { bgcolor: 'grey.100' }
              }}
            >
              VER CALENDARIO DE EVENTOS
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Próximos Eventos */}
      <Box id="proximos-eventos" sx={{ py: 8, bgcolor: 'background.default' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 2 }}>
              PRÓXIMOS <Box component="span" sx={{ color: ACCENT }}>EVENTOS</Box>
            </Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
              A continuación un listado de los próximos eventos que estaremos realizando, estás invitado a participar
            </Typography>
          </Box>

          {upcomingRaces.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography color="text.secondary" variant="h6">No hay carreras programadas aún.</Typography>
            </Box>
          ) : (
            <Grid container spacing={4}>
              {upcomingRaces.map((race) => (
                <Grid size={{ xs: 12, md: 6, lg: 4 }} key={race.id}>
                  <Card sx={{
                    height: '100%',
                    borderRadius: 3,
                    overflow: 'hidden',
                    boxShadow: 3,
                    transition: 'transform 0.3s, box-shadow 0.3s',
                    '&:hover': { transform: 'translateY(-8px)', boxShadow: '0 8px 30px rgba(250, 204, 21, 0.15)' }
                  }}>
                    <Box sx={{
                      height: 160,
                      background: race.imageUrl 
                        ? `url(${race.imageUrl}) center/cover no-repeat`
                        : 'radial-gradient(circle at 50% 0%, #1e293b 0%, #0f172a 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative'
                    }}>
                      {!race.imageUrl && <DirectionsRunIcon sx={{ fontSize: 80, opacity: 0.2, color: 'white' }} />}
                      {race.status === 'active' && (
                        <Chip
                          label="EN VIVO"
                          color="success"
                          size="small"
                          sx={{ position: 'absolute', top: 12, right: 12, fontWeight: 'bold' }}
                        />
                      )}
                    </Box>
                    <CardContent>
                      <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 2 }}>
                        {race.name}
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          <CalendarTodayIcon sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
                          FECHA: {formatDateLong(race.date)}
                        </Typography>
                        {race.location && (
                          <Typography variant="body2" color="text.secondary">
                            <LocationOnIcon sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
                            LUGAR: {race.location}
                          </Typography>
                        )}
                        {race.startTime && (
                          <Typography variant="body2" color="text.secondary">
                            <AccessTimeIcon sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
                            HORA: {race.startTime}
                          </Typography>
                        )}
                        {race.distances && race.distances.length > 0 && (
                          <Typography variant="body2" color="text.secondary">
                            <SpeedIcon sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
                            DISTANCIAS: {race.distances.map(d => d.name).join(' - ')}
                          </Typography>
                        )}
                      </Box>
                      <Button
                        href={`/race/${race.id}`}
                        variant="contained"
                        fullWidth
                        sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#E55A00' } }}
                      >
                        VER MÁS
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Container>
      </Box>

      {/* Últimos Resultados */}
      <Box id="resultados" sx={{ 
        py: 8, 
        bgcolor: 'background.paper',
        borderRadius: '32px',
        mx: { xs: 2, md: 4 },
        mb: { xs: 4, md: 8 },
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
       }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 2 }}>
              ÚLTIMOS <Box component="span" sx={{ color: ACCENT }}>RESULTADOS</Box>
            </Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
              Si has participado en algunos de nuestros eventos puedes ver los resultados a continuación
            </Typography>
          </Box>

          {completedRaces.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography color="text.secondary" variant="h6">No hay resultados disponibles aún.</Typography>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {completedRaces.slice(0, 6).map((race) => (
                <Grid size={{ xs: 12, md: 6 }} key={race.id}>
                  <Card sx={{
                    p: 3,
                    bgcolor: 'background.default',
                    '&:hover': { bgcolor: 'action.hover' },
                    cursor: 'pointer',
                    textDecoration: 'none'
                  }} component="a" href={`/race/${race.id}`}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{race.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Publicado: {formatDate(race.date)}
                        </Typography>
                      </Box>
                      <Typography sx={{ color: ACCENT, fontWeight: 'medium' }}>
                        Ver resultados →
                      </Typography>
                    </Box>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Container>
      </Box>

      {/* Sponsors - Ocultado temporalmente */}
      {/* 
      <Box sx={{ py: 6, bgcolor: 'background.default' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              NUESTROS <Box component="span" sx={{ color: ACCENT }}>SPONSORS</Box>
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 3 }}>
            {sponsors.map((sponsor) => (
              <Box key={sponsor} sx={{
                width: 128,
                height: 64,
                bgcolor: 'background.paper',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 1
              }}>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', textAlign: 'center' }}>
                  {sponsor}
                </Typography>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>
      */}

    </Layout>
  );
}
