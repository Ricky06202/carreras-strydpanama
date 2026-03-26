'use client';

import { createTheme, ThemeProvider, CssBaseline } from '@mui/material';
import { useState, useEffect } from 'react';

function getInitialTheme(): 'light' | 'dark' {
  if (typeof document !== 'undefined') {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  }
  return 'light';
}

export default function MUIThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const theme = getInitialTheme();
    setMode(theme);
    setMounted(true);

    const handleThemeChange = (e: CustomEvent<{ mode: 'light' | 'dark' }>) => {
      setMode(e.detail.mode);
    };

    window.addEventListener('themechange', handleThemeChange as EventListener);
    return () => window.removeEventListener('themechange', handleThemeChange as EventListener);
  }, []);

  const theme = createTheme({
    palette: {
      mode,
      primary: {
        main: '#FF6B00', // Naranja STRYD
      },
      secondary: {
        main: '#E55A00', // Naranja más oscuro
      },
      background: {
        default: mode === 'dark' ? '#0f0f0f' : '#F9FAFB',
        paper: mode === 'dark' ? '#1a1a1a' : '#FFFFFF',
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 12,
            fontWeight: 'bold',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 24,
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: 'outlined',
          size: 'small',
        },
      },
    },
  });

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}