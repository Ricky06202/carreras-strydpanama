'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import TimerIcon from '@mui/icons-material/Timer';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SearchIcon from '@mui/icons-material/Search';

const ACCENT = '#FF6B00';

interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  teamName: string | null;
  finishTime: number | null;
  paymentStatus: string;
}

interface FinishLineControlProps {
  raceId: string;
  timerStart: number | null;
  participants: Participant[];
  onRecordFinish: (participantId: string, time: number) => void;
}

export default function FinishLineControl({ raceId, timerStart, participants, onRecordFinish }: FinishLineControlProps) {
  const [search, setSearch] = useState('');
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [finishTime, setFinishTime] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (timerStart) {
      const interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - timerStart) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timerStart]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredParticipants = participants.filter(p => 
    `${p.firstName} ${p.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    (p.teamName && p.teamName.toLowerCase().includes(search.toLowerCase()))
  );

  const teams = [...new Set(participants.filter(p => p.teamName).map(p => p.teamName))];

  const getTeamMembers = (teamName: string) => {
    return participants.filter(p => p.teamName === teamName);
  };

  const getTeamAverageTime = (teamName: string) => {
    const members = getTeamMembers(teamName).filter(m => m.finishTime);
    if (members.length === 0) return null;
    const total = members.reduce((sum, m) => sum + (m.finishTime || 0), 0);
    return Math.floor(total / members.length);
  };

  const handleOpenFinishDialog = (participant: Participant) => {
    setSelectedParticipant(participant);
    setFinishTime('');
    setOpenDialog(true);
  };

  const handleRecordFinish = () => {
    if (!selectedParticipant || !finishTime) return;
    
    const [hrs, mins, secs] = finishTime.split(':').map(Number);
    const totalSeconds = (hrs * 3600) + (mins * 60) + (secs || 0);
    
    if (timerStart) {
      const finishTimestamp = timerStart + (totalSeconds * 1000);
      onRecordFinish(selectedParticipant.id, finishTimestamp);
    }
    setOpenDialog(false);
  };

  const handleQuickFinish = (participant: Participant) => {
    if (timerStart) {
      onRecordFinish(participant.id, Date.now());
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          Control de Llegada
        </Typography>
        {timerStart && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <TimerIcon sx={{ color: ACCENT }} />
            <Typography variant="h4" sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: ACCENT }}>
              {formatTime(elapsed)}
            </Typography>
          </Box>
        )}
      </Box>

      <TextField
        fullWidth
        placeholder="Buscar participante o equipo..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
        }}
      />

      {teams.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Equipos</Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell>Equipo</TableCell>
                  <TableCell>Miembros</TableCell>
                  <TableCell>Tiempo Promedio</TableCell>
                  <TableCell>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {teams.map(team => {
                  const members = getTeamMembers(team);
                  const finished = members.filter(m => m.finishTime).length;
                  const avgTime = getTeamAverageTime(team);
                  return (
                    <TableRow key={team}>
                      <TableCell sx={{ fontWeight: 'bold' }}>{team}</TableCell>
                      <TableCell>{finished}/{members.length}</TableCell>
                      <TableCell>
                        {avgTime ? formatTime(Math.floor(avgTime / 1000)) : '-'}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={finished === members.length ? 'Completo' : `${finished}/${members.length}`}
                          color={finished === members.length ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      <Typography variant="h6" sx={{ mb: 2 }}>Participantes</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Equipo</TableCell>
              <TableCell>Tiempo</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredParticipants.map(p => (
              <TableRow key={p.id}>
                <TableCell>{p.firstName} {p.lastName}</TableCell>
                <TableCell>{p.teamName || '-'}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace' }}>
                  {p.finishTime ? formatTime(Math.floor(p.finishTime / 1000)) : '-'}
                </TableCell>
                <TableCell>
                  {p.finishTime ? (
                    <Chip icon={<CheckCircleIcon />} label="Finalizado" color="success" size="small" />
                  ) : (
                    <Chip label="En carrera" color="warning" size="small" />
                  )}
                </TableCell>
                <TableCell>
                  {p.finishTime ? (
                    <Button size="small" onClick={() => handleOpenFinishDialog(p)}>
                      Corregir
                    </Button>
                  ) : (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button 
                        size="small" 
                        variant="contained"
                        onClick={() => handleQuickFinish(p)}
                        sx={{ bgcolor: ACCENT }}
                        disabled={!timerStart}
                      >
                        Fin
                      </Button>
                      <Button size="small" onClick={() => handleOpenFinishDialog(p)}>
                        Manual
                      </Button>
                    </Box>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Registrar Tiempo - {selectedParticipant?.firstName} {selectedParticipant?.lastName}</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>Ingresa el tiempo en formato HH:MM:SS</Typography>
          <TextField
            fullWidth
            label="Tiempo"
            value={finishTime}
            onChange={(e) => setFinishTime(e.target.value)}
            placeholder="00:30:00"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleRecordFinish} sx={{ bgcolor: ACCENT }}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
