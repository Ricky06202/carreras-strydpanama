'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, Button, Card, CardContent, Grid, Container, Chip } from '@mui/material';
import Link from '@mui/material/Link';
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

const ACCENT = '#FF6B00'; // Naranja STRYD - NO CAMBIAR - v2

interface Distance {
  id: string;
  name: string;
}

interface Race {
  id: string;
  title: string;
  status: string;
  data?: {
    title?: string;
    description?: string;
    date?: string;
    startTime?: string;
    status?: string;
    location?: string;
    price?: number;
    imageUrl?: string;
  };
}

function formatDateLong(dateStr: string) {
  if (!dateStr) return 'Por definir';
  // Evitar error de un día menos al parsear YYYY-MM-DD como UTC
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('es-PA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('es-PA');
}

interface HomePageProps {
  initialRaces?: Race[];
}

export default function HomePage({ initialRaces = [] }: HomePageProps) {
  const [upcomingRaces, setUpcomingRaces] = useState<Race[]>(() => {
    if (initialRaces && initialRaces.length > 0) {
      const upcoming = initialRaces.filter((r: any) => 
        r.data?.status === 'accepting' || r.data?.status === 'upcoming' || r.status === 'published'
      );
      return upcoming;
    }
    return [];
  });
  const [completedRaces, setCompletedRaces] = useState<Race[]>(() => {
    if (initialRaces && initialRaces.length > 0) {
      const completed = initialRaces.filter((r: any) => 
        r.data?.status === 'finished'
      );
      return completed;
    }
    return [];
  });

  useEffect(() => {
    if (initialRaces && initialRaces.length > 0) {
      const upcoming = initialRaces.filter((r: any) => 
        r.data?.status === 'accepting' || r.data?.status === 'upcoming' || r.status === 'published'
      );
      const completed = initialRaces.filter((r: any) => 
        r.data?.status === 'finished'
      );
      setUpcomingRaces(upcoming);
      setCompletedRaces(completed);
    }
  }, [initialRaces]);

  return (
    <Layout>
      {/* Hero Section */}
      <Box sx={{
        height: { xs: 400, md: 500 },
        background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)',
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
              <Box component="span" sx={{ color: ACCENT }}>CARRERAS BY STRYD PANAMA</Box>
            </Typography>
            <Typography variant="h5" sx={{ color: 'white', mb: 4, maxWidth: 600 }}>
              Te damos la bienvenida a nuestro sitio web con información sobre los eventos de running que realizamos en Panamá
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                href="#proximos-eventos"
                variant="contained"
                size="large"
                sx={{
                  bgcolor: ACCENT,
                  color: '#FFFFFF',
                  fontWeight: 'bold',
                  px: 4,
                  py: 1.5,
                  '&:hover': { bgcolor: '#E55A00' }
                }}
              >
                VER EVENTOS
              </Button>
              {(() => {
                const openRace = upcomingRaces.find((r: any) => r.data?.status === 'accepting');
                return openRace ? (
                  <Button
                    component="a"
                    href={`/register?race=${openRace.id}`}
                    variant="contained"
                    size="large"
                    sx={{
                      bgcolor: '#FFFFFF',
                      color: '#000',
                      fontWeight: 'bold',
                      px: 4,
                      py: 1.5,
                      '&:hover': { bgcolor: '#f0f0f0' }
                    }}
                  >
                    🏃 INSCRÍBETE AHORA
                  </Button>
                ) : null;
              })()}
              <Button
                href="/mis-inscripciones"
                variant="outlined"
                size="large"
                sx={{
                  borderColor: '#FFFFFF',
                  color: '#FFFFFF',
                  fontWeight: 'bold',
                  px: 3,
                  py: 1.5,
                  '&:hover': { borderColor: ACCENT, color: ACCENT, bgcolor: 'rgba(255,107,0,0.08)' }
                }}
              >
                🔍 MIS INSCRIPCIONES
              </Button>
            </Box>
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
                    '&:hover': { transform: 'translateY(-8px)', boxShadow: '0 8px 30px rgba(255, 107, 0, 0.15)' }
                  }}>
                    <Box sx={{
                      height: 220,
                      background: race.data?.imageUrl 
                        ? `#0f0f0f url(${race.data.imageUrl}) center/contain no-repeat`
                        : 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative'
                    }}>
                      {!race.data?.imageUrl && <DirectionsRunIcon sx={{ fontSize: 80, opacity: 0.2, color: 'white' }} />}
                      {race.data?.status === 'active' && (
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
                        {race.data?.title || race.title}
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          <CalendarTodayIcon sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
                          FECHA: {race.data?.date ? formatDateLong(race.data.date) : 'Por definir'}
                        </Typography>
                        {race.data?.location && (
                          <Typography variant="body2" color="text.secondary">
                            <LocationOnIcon sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
                            LUGAR: {race.data?.location}
                          </Typography>
                        )}
                        {race.data?.startTime && (
                          <Typography variant="body2" color="text.secondary">
                            <AccessTimeIcon sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
                            HORA: {race.data?.startTime}
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          component="a"
                          href={`/race/${race.id}`}
                          variant="outlined"
                          sx={{
                            flex: 1,
                            textDecoration: 'none',
                            borderColor: ACCENT,
                            color: ACCENT,
                            '&:hover': { bgcolor: 'rgba(255,107,0,0.08)', borderColor: ACCENT }
                          }}
                        >
                          VER MÁS
                        </Button>
                        {race.data?.status === 'accepting' && (
                          <Button
                            component="a"
                            href={`/register?race=${race.id}`}
                            variant="contained"
                            sx={{
                              flex: 1,
                              textDecoration: 'none',
                              bgcolor: ACCENT,
                              fontWeight: 'bold',
                              '&:hover': { bgcolor: '#E55A00' }
                            }}
                          >
                            INSCRIBIRSE
                          </Button>
                        )}
                      </Box>
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
                  }} component="a" href={`/resultados?raceId=${race.id}`}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{race.data?.title || race.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                         Publicado: {race.data?.date ? formatDate(race.data.date) : ''}
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
