'use client';

import { useState, useEffect } from 'react';
import { Box, AppBar, Toolbar, Typography, Button, IconButton, ThemeProvider, createTheme, CssBaseline, Container } from '@mui/material';
import { Link } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';

const ACCENT = '#facc15';

function getInitialTheme(): 'light' | 'dark' {
  if (typeof document !== 'undefined') {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return 'dark'; // Por defecto oscuro
  }
  return 'dark';
}

interface LayoutProps {
  children: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
}

export default function Layout({ children, maxWidth = 'lg' }: LayoutProps) {
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const theme = getInitialTheme();
    setMode(theme);
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
        default: mode === 'dark' ? '#020617' : '#F9FAFB',
        paper: mode === 'dark' ? '#0f172a' : '#FFFFFF',
      },
    },
  });

  const toggleTheme = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(newMode);
    localStorage.setItem('theme', newMode);
    window.dispatchEvent(new CustomEvent('themechange', { detail: { mode: newMode } }));
  };

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default', color: 'text.primary' }}>
        <AppBar position="sticky" sx={{ bgcolor: 'background.paper', boxShadow: 1 }}>
          <Container maxWidth="lg">
            <Toolbar disableGutters>
              <Link href="/" underline="none" sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
                <Box sx={{ width: 40, height: 40, bgcolor: ACCENT, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DirectionsRunIcon sx={{ color: 'white' }} />
                </Box>
                <Typography variant="h6" sx={{ color: ACCENT, fontWeight: 'bold' }}>Carreras by StrydPanama</Typography>
              </Link>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Button component={Link} href="/" sx={{ color: 'text.primary' }}>Carreras</Button>
                <Button component={Link} href="/register" sx={{ color: 'text.primary' }}>Inscribirse</Button>
                <IconButton onClick={toggleTheme} sx={{ bgcolor: 'action.hover' }}>
                  {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
                </IconButton>
              </Box>
            </Toolbar>
          </Container>
        </AppBar>
        <Container maxWidth={maxWidth} sx={{ flex: 1, py: 4 }}>
          {children}
        </Container>
        <Box component="footer" sx={{ bgcolor: mode === 'dark' ? '#020617' : '#1F2937', color: 'white', py: 4, borderTop: '1px solid #1e293b' }}>
          <Container maxWidth="lg">
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mb: 2 }}>
              <Link href="https://strydpanama.com" target="_blank" rel="noopener noreferrer" sx={{ color: 'grey.400', '&:hover': { color: ACCENT } }}>
                Quiénes somos
              </Link>
            </Box>
            <Typography variant="body2" sx={{ color: 'grey.400', textAlign: 'center' }}>
              © 2026 Stryd Panama. Todos los derechos reservados.
            </Typography>
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
