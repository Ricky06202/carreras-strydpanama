'use client';

import { useState, useEffect } from 'react';
import {
  Box, Typography, AppBar, Toolbar, IconButton, Button, ThemeProvider, createTheme, CssBaseline, Chip, Container
} from '@mui/material';
import { Link as MuiLink } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AddIcon from '@mui/icons-material/Add';

const ACCENT = '#FF6B00';

function getInitialTheme(): 'light' | 'dark' {
  if (typeof document !== 'undefined') {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return 'dark'; // Por defecto oscuro
  }
  return 'dark';
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
  maxParticipants: number | null;
  imageUrl: string | null;
  technicalInfo: string | null;
  termsAndConditions: string | null;
  timerStart: number | null;
  timerStop: number | null;
  showTimer: boolean;
  showShirtSize: boolean;
  routeGeoJson: string | null;
}

interface AdminLayoutProps {
  children: React.ReactNode;
  races: Race[];
  selectedRaceId: string | null;
  onSelectRace: (race: Race | null) => void;
  onNewRace: () => void;
}

export default function AdminLayout({ children, races, selectedRaceId, onSelectRace, onNewRace }: AdminLayoutProps) {
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMode(getInitialTheme());
    setMounted(true);

    const handleThemeChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.mode) {
        setMode(detail.mode);
      }
    };

    window.addEventListener('themechange', handleThemeChange);
    return () => window.removeEventListener('themechange', handleThemeChange);
  }, []);

  const theme = createTheme({
    palette: {
      mode,
      primary: { main: ACCENT },
      background: {
        default: mode === 'dark' ? '#111827' : '#F9FAFB',
        paper: mode === 'dark' ? '#1F2937' : '#FFFFFF',
      },
    },
  });

  const sidebarBg = mode === 'dark' ? '#1F2937' : '#FFFFFF';
  const textColor = mode === 'dark' ? '#F9FAFB' : '#111827';
  const secondaryTextColor = mode === 'dark' ? '#9CA3AF' : '#6B7280';

  const toggleTheme = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(newMode);
    localStorage.setItem('theme', newMode);
    window.dispatchEvent(new CustomEvent('themechange', { detail: { mode: newMode } }));
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('es-PA');

  if (!mounted) {
    return null;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppBar position="sticky" sx={{ bgcolor: sidebarBg, boxShadow: 1 }}>
          <Container maxWidth="xl" disableGutters>
            <Toolbar>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1 }}>
              <MuiLink href="/" underline="none" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: ACCENT, fontWeight: 'bold' }}>
                <ArrowBackIcon />
                Volver
              </MuiLink>
                <Typography variant="h6" sx={{ color: ACCENT, fontWeight: 'bold' }}>
                  <AdminPanelSettingsIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                  Admin
                </Typography>
              </Box>
              <IconButton onClick={toggleTheme} sx={{ bgcolor: 'action.hover' }}>
                {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
              </IconButton>
            </Toolbar>
          </Container>
        </AppBar>

        <Container maxWidth="xl" disableGutters>
          <Box sx={{ display: 'flex' }}>
            <Box sx={{ 
              width: 280, 
              bgcolor: sidebarBg, 
              borderRight: 1, 
              borderColor: 'divider', 
              minHeight: 'calc(100vh - 64px)',
              position: 'sticky',
              top: 64,
              height: 'calc(100vh - 64px)',
              overflow: 'auto'
            }}>
              <Box sx={{ p: 2 }}>
                <Button 
                  fullWidth 
                  variant="contained" 
                  onClick={onNewRace}
                  sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#E55A00' } }}
                  startIcon={<AddIcon />}
                >
                  Nueva Carrera
                </Button>
              </Box>
              <Box>
                {races.map(race => (
                  <Box
                    key={race.id}
                    onClick={() => onSelectRace(race)}
                    sx={{ 
                      p: 2, 
                      cursor: 'pointer',
                      bgcolor: selectedRaceId === race.id ? 'action.selected' : 'transparent',
                      borderBottom: 1,
                      borderColor: 'divider',
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                  >
                    <Typography sx={{ color: textColor, fontWeight: 500 }}>{race.name}</Typography>
                    <Typography variant="body2" sx={{ color: secondaryTextColor }}>{formatDate(race.date)}</Typography>
                    <Chip 
                      size="small" 
                      label={race.status === 'active' ? 'Activa' : race.status} 
                      sx={{ mt: 1, bgcolor: race.status === 'active' ? 'success.main' : 'grey.500', color: 'white' }}
                    />
                  </Box>
                ))}
              </Box>
            </Box>
            <Box sx={{ flex: 1 }}>
              {children}
            </Box>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
