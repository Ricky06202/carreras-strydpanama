'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import TimerIcon from '@mui/icons-material/Timer';

interface RaceTimerProps {
  timerStart: number | null;
  timerStop: number | null;
  raceName: string;
  raceStatus: string;
}

export default function RaceTimer({ timerStart, timerStop, raceName, raceStatus }: RaceTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  // Convertimos a número por si vienen como string de la API
  const start = timerStart ? Number(timerStart) : null;
  const stop = timerStop ? Number(timerStop) : null;

  useEffect(() => {
    if (!start) {
      setElapsed(0);
      return;
    }

    const calculateElapsed = () => {
      const now = stop || Math.floor(Date.now() / 1000);
      setElapsed(now - start);
    };

    calculateElapsed();
    
    if (!stop) {
      const interval = setInterval(calculateElapsed, 1000);
      return () => clearInterval(interval);
    }
  }, [start, stop]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Se muestra siempre que haya un tiempo de inicio definido
  if (!start) {
    return null;
  }

  return (
    <Paper 
      elevation={4} 
      sx={{ 
        p: 3, 
        textAlign: 'center',
        bgcolor: timerStop ? 'grey.800' : 'error.main',
        color: 'white',
        borderRadius: 3
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 2 }}>
        <TimerIcon sx={{ fontSize: 32 }} />
        <Typography variant="h6">{timerStop ? 'Tiempo Final' : 'Cronómetro en Vivo'}</Typography>
      </Box>
      <Typography 
        variant="h2" 
        sx={{ 
          fontFamily: 'monospace', 
          fontWeight: 'bold',
          letterSpacing: 4,
          textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
        }}
      >
        {formatTime(elapsed)}
      </Typography>
      <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
        {timerStop ? 'Carrera detenida' : 'Tiempo transcurrido'}
      </Typography>
    </Paper>
  );
}
