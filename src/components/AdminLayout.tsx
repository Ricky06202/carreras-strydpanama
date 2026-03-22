'use client';

import { useState, useEffect } from 'react';
import {
  Box, Typography, AppBar, Toolbar, IconButton
} from '@mui/material';
import { Link } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

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
            <Link href="/" underline="none" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: ACCENT, fontWeight: 'bold' }}>
              <ArrowBackIcon />
              Volver
            </Link>
            <Typography variant="h6" sx={{ color: ACCENT, fontWeight: 'bold' }}>
              <AdminPanelSettingsIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              Admin
            </Typography>
          </Box>
          <IconButton onClick={toggleTheme} sx={{ bgcolor: 'action.hover' }}>
            {theme === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Toolbar>
      </AppBar>
      {children}
    </Box>
  );
}
