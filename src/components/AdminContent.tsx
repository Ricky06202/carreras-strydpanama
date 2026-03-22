'use client';

import { useState } from 'react';
import {
  Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Box, Typography, Chip, Tabs, Tab, Snackbar, Alert
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import VpnKeyIcon from '@mui/icons-material/VpnKey';

const ACCENT = '#FF6B00';

interface Race {
  id: string;
  name: string;
  description: string;
  date: string;
  status: string;
  location: string;
  price: number;
  maxParticipants: number;
}

interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  paymentStatus: string;
  size: string;
}

interface RegistrationCode {
  id: string;
  code: string;
  used: number;
}

interface AdminContentProps {
  selectedRace: Race | null;
  participants: Participant[];
  codes: RegistrationCode[];
  onStartRace: () => void;
  onEditRace: (race: Race) => void;
  onDeleteRace: (id: string) => void;
  onExportCSV: () => void;
  onGenerateCodes: (count: number) => void;
}

export default function AdminContent({ 
  selectedRace, 
  participants, 
  codes, 
  onStartRace, 
  onEditRace, 
  onDeleteRace, 
  onExportCSV,
  onGenerateCodes 
}: AdminContentProps) {
  const [tab, setTab] = useState(0);
  const [openCodesDialog, setOpenCodesDialog] = useState(false);
  const [codesCount, setCodesCount] = useState(10);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleGenerateCodes = () => {
    onGenerateCodes(codesCount);
    setOpenCodesDialog(false);
    showNotification(`${codesCount} códigos generados`, 'success');
  };

  return (
    <Box sx={{ p: 4 }}>
      {!selectedRace ? (
        <Typography color="text.secondary" variant="h5">Selecciona una carrera para gestionar</Typography>
      ) : (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h5" fontWeight="bold">{selectedRace.name}</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {selectedRace.status === 'upcoming' && (
                <Button 
                  variant="contained" 
                  onClick={onStartRace}
                  sx={{ bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' } }}
                  startIcon={<PlayArrowIcon />}
                >
                  Iniciar
                </Button>
              )}
              <Button variant="outlined" onClick={() => onEditRace(selectedRace)} startIcon={<EditIcon />}>Editar</Button>
              <Button variant="outlined" color="error" onClick={() => onDeleteRace(selectedRace.id)} startIcon={<DeleteIcon />}></Button>
            </Box>
          </Box>

          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
            <Tab label="Participantes" />
            <Tab label="Códigos" />
          </Tabs>

          {tab === 0 && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button variant="outlined" onClick={onExportCSV} startIcon={<DownloadIcon />}>
                  Exportar CSV
                </Button>
              </Box>
              <TableContainer component={Paper} elevation={2}>
                <Table>
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell>Nombre</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Teléfono</TableCell>
                      <TableCell>Talla</TableCell>
                      <TableCell>Estado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {participants.map(p => (
                      <TableRow key={p.id}>
                        <TableCell>{p.firstName} {p.lastName}</TableCell>
                        <TableCell>{p.email}</TableCell>
                        <TableCell>{p.phone || '-'}</TableCell>
                        <TableCell>{p.size || '-'}</TableCell>
                        <TableCell>
                          <Chip 
                            size="small" 
                            label={p.paymentStatus === 'paid' ? 'Pagado' : 'Pendiente'}
                            sx={{ bgcolor: p.paymentStatus === 'paid' ? 'success.main' : 'warning.main', color: 'white' }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {participants.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4 }}>Sin participantes</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}

          {tab === 1 && (
            <Box>
              <Button 
                variant="contained" 
                onClick={() => setOpenCodesDialog(true)}
                sx={{ mb: 2, bgcolor: ACCENT, '&:hover': { bgcolor: '#E55A00' } }}
                startIcon={<VpnKeyIcon />}
              >
                Generar Códigos
              </Button>
              <TableContainer component={Paper} elevation={2}>
                <Table>
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell>Código</TableCell>
                      <TableCell>Estado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {codes.map(c => (
                      <TableRow key={c.id}>
                        <TableCell sx={{ fontFamily: 'monospace' }}>{c.code}</TableCell>
                        <TableCell>
                          <Chip 
                            size="small" 
                            label={c.used ? 'Usado' : 'Disponible'}
                            sx={{ bgcolor: c.used ? 'grey.500' : 'success.main', color: 'white' }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {codes.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} sx={{ textAlign: 'center', py: 4 }}>Sin códigos</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </>
      )}

      <Dialog open={openCodesDialog} onClose={() => setOpenCodesDialog(false)}>
        <DialogTitle>Generar Códigos</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField 
            label="Cantidad" 
            type="number" 
            value={codesCount} 
            onChange={(e) => setCodesCount(parseInt(e.target.value) || 10)} 
            fullWidth 
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCodesDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleGenerateCodes} sx={{ bgcolor: ACCENT }}>Generar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!notification} autoHideDuration={4000} onClose={() => setNotification(null)}>
        {notification && (
          <Alert severity={notification.type} sx={{ width: '100%' }}>
            {notification.message}
          </Alert>
        )}
      </Snackbar>
    </Box>
  );
}
