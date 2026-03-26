'use client';

import { useState, useEffect } from 'react';
import { Box, AppBar, Toolbar, Typography, Button, IconButton, ThemeProvider, createTheme, CssBaseline, Container } from '@mui/material';
import { Link } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';

const ACCENT = '#FF6B00'; // Naranja STRYD

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
  const [mode, setMode] = useState<'light' | 'dark'>(() => getInitialTheme());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
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
        default: mode === 'dark' ? '#0f0f0f' : '#F9FAFB',
        paper: mode === 'dark' ? '#1a1a1a' : '#FFFFFF',
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

  // Eliminamos el if (!mounted) que causaba que el servidor renderizara sin temas.
  // MUI necesita el ThemeProvider en el servidor para generar los estilos iniciales.
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ 
        minHeight: '80vh', 
        display: 'flex', 
        flexDirection: 'column', 
        bgcolor: 'background.default', // Usamos el color del tema explícitamente
        color: 'text.primary',
        transition: 'background-color 0.3s, color 0.3s'
      }}>
        {mounted && (
          <AppBar position="static" sx={{ bgcolor: 'background.paper', color: 'text.primary', boxShadow: 1 }}>
            <Toolbar>
              <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold', color: ACCENT }}>
                DASHBOARD
              </Typography>
              <IconButton onClick={toggleTheme} color="inherit">
                {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
              </IconButton>
            </Toolbar>
          </AppBar>
        )}
        <Container maxWidth={maxWidth} sx={{ flex: 1, py: 4 }}>
          {children}
        </Container>
      </Box>
    </ThemeProvider>
  );
}
