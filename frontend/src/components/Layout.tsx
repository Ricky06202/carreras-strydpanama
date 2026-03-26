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

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', bgcolor: 'transparent', color: 'text.primary' }}>
        <Container maxWidth={maxWidth} sx={{ flex: 1, py: 4 }}>
          {children}
        </Container>
      </Box>
    </ThemeProvider>
  );
}
