'use client';

import { useState, useEffect } from 'react';
import {
  Box, Typography, Button, AppBar, Toolbar, IconButton
} from '@mui/material';
import { Link } from '@mui/material';

const ACCENT = '#FF6B00';

function getTheme(): 'light' | 'dark' {
  if (typeof document !== 'undefined') {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  }
  return 'light';
}

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    setTheme(getTheme());
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(newTheme);
    localStorage.setItem('theme', newTheme);
    window.dispatchEvent(new CustomEvent('themechange', { detail: { mode: newTheme } }));
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" sx={{ bgcolor: 'background.paper', boxShadow: 1 }}>
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1 }}>
            <Link href="/" underline="none" sx={{ color: ACCENT, fontWeight: 'bold', fontSize: '1.25rem' }}>
              ← Volver
            </Link>
            <Typography variant="h6" sx={{ color: ACCENT, fontWeight: 'bold' }}>
              Stryd Panama Admin
            </Typography>
          </Box>
          <IconButton onClick={toggleTheme} sx={{ bgcolor: 'action.hover' }}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </IconButton>
        </Toolbar>
      </AppBar>
      {children}
    </Box>
  );
}
