'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Paper, Button, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar, Alert } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const ACCENT = '#FF6B00';

interface Team { id: string; name: string; isApproved: number; }

export default function AdminTeamsDashboard() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [editTeam, setEditTeam] = useState<Team | null>(null);
  const [teamFormName, setTeamFormName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; teamId: string | null }>({ open: false, teamId: null });

  const fetchTeams = () => {
    setLoading(true);
    fetch('/api/admin/teams')
      .then(r => r.json())
      .then(d => { if (d.teams) setTeams(d.teams); setLoading(false); })
      .catch((e) => { setNotification({ message: 'Error cargando equipos', type: 'error' }); setLoading(false); });
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const handleApprove = async (team: Team) => {
    try {
      const res = await fetch(`/api/admin/teams/${team.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isApproved: 1 })
      });
      if (res.ok) {
        setNotification({ message: 'Equipo aprobado', type: 'success' });
        fetchTeams();
      } else throw new Error();
    } catch {
      setNotification({ message: 'Error al aprobar', type: 'error' });
    }
  };

  const openEdit = (team: Team) => {
    setEditTeam(team);
    setTeamFormName(team.name);
    setDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editTeam) return;
    try {
      // Upon editing, we automatically approve it so it becomes part of the final robust list.
      const res = await fetch(`/api/admin/teams/${editTeam.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: teamFormName, isApproved: 1 })
      });
      if (res.ok) {
        setNotification({ message: 'Equipo actualizado, corregido y aprobado', type: 'success' });
        setDialogOpen(false);
        fetchTeams();
      } else throw new Error();
    } catch {
      setNotification({ message: 'Error al guardar', type: 'error' });
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.teamId) return;
    try {
      const res = await fetch(`/api/admin/teams/${deleteConfirm.teamId}`, { method: 'DELETE' });
      if (res.ok) {
        setNotification({ message: 'Equipo rechazado / eliminado', type: 'success' });
        fetchTeams();
      } else throw new Error();
    } catch {
      setNotification({ message: 'Error al eliminar', type: 'error' });
    }
    setDeleteConfirm({ open: false, teamId: null });
  };

  return (
    <Box sx={{ py: 4, px: 2 }}>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
        Gestor Global de Equipos (Teams)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Alinea los nombres introducidos por los usuarios manualmente (Pendientes) con los nombres correctos.
        Los equipos "Aprobados" aparecerán en el buscador oficial del formulario de inscripción. 
        Al editar un nombre pendiente, automáticamente corregirás la ortografía de los participantes que se inscribieron con ese error.
      </Typography>

      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell>Nombre del Equipo</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={3} sx={{ textAlign: 'center', py: 4 }}>Cargando...</TableCell></TableRow>
            ) : teams.length === 0 ? (
              <TableRow><TableCell colSpan={3} sx={{ textAlign: 'center', py: 4 }}>No hay equipos registrados</TableCell></TableRow>
            ) : (
              teams.map(t => (
                <TableRow key={t.id} sx={{ bgcolor: t.isApproved === 0 ? 'rgba(255, 107, 0, 0.05)' : 'inherit' }}>
                  <TableCell sx={{ fontWeight: t.isApproved === 0 ? 'bold' : 'normal' }}>{t.name}</TableCell>
                  <TableCell>
                    <Chip 
                      size="small" 
                      label={t.isApproved === 1 ? 'Aprobado' : 'Pendiente'}
                      sx={{ 
                        bgcolor: t.isApproved === 1 ? 'success.main' : 'warning.main', 
                        color: 'white', fontWeight: 'bold' 
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {t.isApproved === 0 && (
                        <Button size="small" variant="contained" color="success" onClick={() => handleApprove(t)} startIcon={<CheckCircleIcon />}>
                          Aprobar
                        </Button>
                      )}
                      <Button size="small" variant="outlined" onClick={() => openEdit(t)} startIcon={<EditIcon />}>
                        Editar & Aprobar
                      </Button>
                      <Button size="small" color="error" onClick={() => setDeleteConfirm({ open: true, teamId: t.id })} startIcon={<DeleteIcon />}>
                        Rechazar
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar y Aprobar Equipo</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <Typography variant="body2" color="warning.main" sx={{ mb: 2 }}>
            Si un usuario escribió "Los Rapidozz", puedes corregirlo aquí a "Los Rápidos". Esto actualizará también su perfil para que coincida globalmente.
          </Typography>
          <TextField 
            label="Nombre oficial del equipo" 
            value={teamFormName} 
            onChange={(e) => setTeamFormName(e.target.value)} 
            fullWidth 
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveEdit} disabled={!teamFormName} sx={{ bgcolor: ACCENT }}>Guardar Cambios</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirm.open} onClose={() => setDeleteConfirm({ open: false, teamId: null })}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography>¿Estás seguro de que deseas rechazar y eliminar este equipo? Si hay participantes asignados a él, conservarán el nombre textualmente pero dejará de ser una entidad administrable.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm({ open: false, teamId: null })}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={confirmDelete}>Eliminar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!notification} autoHideDuration={4000} onClose={() => setNotification(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Box>
          {notification && (
            <Alert severity={notification.type} sx={{ width: '100%' }}>
              {notification.message}
            </Alert>
          )}
        </Box>
      </Snackbar>
    </Box>
  );
}
