'use client';

import { useState } from 'react';
import {
  Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Box, Typography, Chip, Tabs, Tab, Snackbar, Alert,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import DoneIcon from '@mui/icons-material/Done';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FinishLineControl from './FinishLineControl';
import RouteEditor from './RouteEditor';
import DownloadIcon from '@mui/icons-material/Download';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import AddIcon from '@mui/icons-material/Add';
import CategoryIcon from '@mui/icons-material/Category';
import TimerIcon from '@mui/icons-material/Timer';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import MapIcon from '@mui/icons-material/Map';

const ACCENT = '#FF6B00';
// @ts-ignore
const API_BASE = import.meta.env.SONICJS_API_URL || 'http://localhost:8787';

interface Race {
  id: string;
  name: string;
  description: string | null;
  date: string;
  startTime: string | null;
  status: string;
  location: string | null;
  price: number;
  maxParticipants: number | null;
  imageUrl: string | null;
  technicalInfo: string | null;
  termsAndConditions: string | null;
  timerStart: number | null;
  timerStop: number | null;
  showTimer: boolean;
  showShirtSize: boolean;
  routeGeoJson: string | null;
}

interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  paymentStatus: string;
  size: string;
  categoryId: string | null;
  distanceId: string | null;
  teamName: string | null;
  bibNumber: number | null;
  finishTime: number | null;
  termsAccepted: boolean;
}

interface Category {
  id: string;
  name: string;
}

interface Distance {
  id: string;
  name: string;
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
  categories: Category[];
  distances: Distance[];
  onActivateRace: () => void;
  onFinishRace: () => void;
  onCompleteRace: () => void;
  onStartTimer: () => void;
  onStopTimer: () => void;
  onEditRace: (race: Race) => void;
  onDeleteRace: (id: string) => void;
  onExportCSV: () => void;
  onGenerateCodes: (count: number) => void;
  onCreateCategory: (data: Partial<Category>) => void;
  onUpdateCategory: (id: string, data: Partial<Category>) => void;
  onDeleteCategory: (id: string) => void;
  onCreateDistance: (data: Partial<Distance>) => void;
  onUpdateDistance: (id: string, data: Partial<Distance>) => void;
  onDeleteDistance: (id: string) => void;
  onUpdateParticipant: (id: string, data: Partial<Participant>) => void;
  onDeleteParticipant: (id: string) => void;
}

export default function AdminContent({ 
  selectedRace, 
  participants, 
  codes,
  categories,
  distances,
  onActivateRace, 
  onFinishRace, 
  onCompleteRace, 
  onStartTimer, 
  onStopTimer, 
  onEditRace, 
  onDeleteRace, 
  onExportCSV,
  onGenerateCodes,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onCreateDistance,
  onUpdateDistance,
  onDeleteDistance,
  onUpdateParticipant,
  onDeleteParticipant
}: AdminContentProps) {
  const [tab, setTab] = useState(0);
  const [openCodesDialog, setOpenCodesDialog] = useState(false);
  const [codesCount, setCodesCount] = useState(10);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [openCategoryDialog, setOpenCategoryDialog] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '' });
  const [openDistanceDialog, setOpenDistanceDialog] = useState(false);
  const [editDistance, setEditDistance] = useState<Distance | null>(null);
  const [distanceForm, setDistanceForm] = useState({ name: '' });
  const [openParticipantDialog, setOpenParticipantDialog] = useState(false);
  const [editParticipant, setEditParticipant] = useState<Participant | null>(null);
  const [participantForm, setParticipantForm] = useState({ firstName: '', lastName: '', email: '', phone: '', paymentStatus: '', teamName: '' });

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleGenerateCodes = () => {
    onGenerateCodes(codesCount);
    setOpenCodesDialog(false);
    showNotification(`${codesCount} códigos generados`, 'success');
  };

  const handleOpenCategoryDialog = (category?: Category) => {
    if (category) {
      setEditCategory(category);
      setCategoryForm({ name: category.name });
    } else {
      setEditCategory(null);
      setCategoryForm({ name: '' });
    }
    setOpenCategoryDialog(true);
  };

  const handleSaveCategory = () => {
    const data = { name: categoryForm.name };
    
    if (editCategory) {
      onUpdateCategory(editCategory.id, data);
      showNotification('Categoría actualizada', 'success');
    } else {
      onCreateCategory(data);
      showNotification('Categoría creada', 'success');
    }
    setOpenCategoryDialog(false);
  };

  const handleDeleteCategory = (id: string) => {
    if (confirm('¿Eliminar esta categoría?')) {
      onDeleteCategory(id);
      showNotification('Categoría eliminada', 'success');
    }
  };

  const handleOpenDistanceDialog = (distance?: Distance) => {
    if (distance) {
      setEditDistance(distance);
      setDistanceForm({ name: distance.name });
    } else {
      setEditDistance(null);
      setDistanceForm({ name: '' });
    }
    setOpenDistanceDialog(true);
  };

  const handleSaveDistance = () => {
    const data = { name: distanceForm.name };
    
    if (editDistance) {
      onUpdateDistance(editDistance.id, data);
      showNotification('Distancia actualizada', 'success');
    } else {
      onCreateDistance(data);
      showNotification('Distancia creada', 'success');
    }
    setOpenDistanceDialog(false);
  };

  const handleDeleteDistance = (id: string) => {
    if (confirm('¿Eliminar esta distancia?')) {
      onDeleteDistance(id);
      showNotification('Distancia eliminada', 'success');
    }
  };

  const handleOpenParticipantDialog = (participant: Participant) => {
    setEditParticipant(participant);
    setParticipantForm({
      firstName: participant.firstName,
      lastName: participant.lastName,
      email: participant.email,
      phone: participant.phone || '',
      paymentStatus: participant.paymentStatus,
      teamName: participant.teamName || ''
    });
    setOpenParticipantDialog(true);
  };

  const handleSaveParticipant = () => {
    if (editParticipant) {
      onUpdateParticipant(editParticipant.id, participantForm);
      showNotification('Participante actualizado', 'success');
    }
    setOpenParticipantDialog(false);
  };

  const handleDeleteParticipant = (id: string) => {
    if (confirm('¿Eliminar este participante?')) {
      onDeleteParticipant(id);
      showNotification('Participante eliminado', 'success');
    }
  };

  const handleRecordFinish = async (participantId: string, finishTime: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/participant/${participantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finishTime })
      });
      if (res.ok) {
        showNotification('Tiempo registrado', 'success');
        if (selectedRace) {
          fetch(`${API_BASE}/api/admin/race/${selectedRace.id}`)
            .then(r => r.json())
            .then(d => { if (d.participants) onUpdateParticipant(d.participants[0]?.id || '', {}); })
            .catch(() => {});
        }
      } else {
        showNotification('Error al registrar tiempo', 'error');
      }
    } catch {
      showNotification('Error al registrar tiempo', 'error');
    }
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return '-';
    const cat = categories.find(c => c.id === categoryId);
    return cat ? cat.name : '-';
  };

  return (
    <Box sx={{ py: 4 }}>
      {!selectedRace ? (
        <Typography color="text.secondary" variant="h5">Selecciona una carrera para gestionar</Typography>
      ) : (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h5" fontWeight="bold">{selectedRace.name}</Typography>
              <Chip 
                label={
                  selectedRace.status === 'upcoming' ? 'Próximamente' :
                  selectedRace.status === 'accepting' ? 'Inscripciones Abiertas' :
                  selectedRace.status === 'active' ? 'Carrera en Vivo' :
                  'Finalizada'
                }
                sx={{ 
                  bgcolor: 
                    selectedRace.status === 'upcoming' ? 'grey.500' :
                    selectedRace.status === 'accepting' ? 'success.main' :
                    selectedRace.status === 'active' ? 'error.main' :
                    'grey.700',
                  color: 'white',
                  fontWeight: 'bold'
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {/* Botones de estado de carrera */}
              {selectedRace.status === 'upcoming' && (
                <Button 
                  variant="contained" 
                  onClick={onActivateRace}
                  sx={{ bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' } }}
                  startIcon={<HowToRegIcon />}
                >
                  Activar Inscripciones
                </Button>
              )}
              {selectedRace.status === 'accepting' && (
                <Button 
                  variant="contained" 
                  onClick={onFinishRace}
                  sx={{ bgcolor: 'warning.main', '&:hover': { bgcolor: 'warning.dark' } }}
                  startIcon={<StopIcon />}
                >
                  Cerrar Inscripciones
                </Button>
              )}
              
              {/* Botones de cronómetro */}
              {(selectedRace.status === 'accepting' || selectedRace.status === 'active') && !selectedRace.timerStart && (
                <Button 
                  variant="contained" 
                  onClick={onStartTimer}
                  sx={{ bgcolor: 'info.main', '&:hover': { bgcolor: 'info.dark' } }}
                  startIcon={<TimerIcon />}
                >
                  Iniciar Cronómetro
                </Button>
              )}
              {selectedRace.status === 'active' && selectedRace.timerStart && !selectedRace.timerStop && (
                <Button 
                  variant="contained" 
                  onClick={onStopTimer}
                  sx={{ bgcolor: 'warning.main', '&:hover': { bgcolor: 'warning.dark' } }}
                  startIcon={<PauseIcon />}
                >
                  Detener Cronómetro
                </Button>
              )}
              
              {/* Marcar como terminada */}
              {selectedRace.status === 'active' && (
                <Button 
                  variant="contained" 
                  onClick={onCompleteRace}
                  sx={{ bgcolor: 'grey.700', '&:hover': { bgcolor: 'grey.800' } }}
                  startIcon={<DoneIcon />}
                >
                  Finalizar Carrera
                </Button>
              )}
              
              <Button variant="outlined" onClick={() => onEditRace(selectedRace)} startIcon={<EditIcon />}>Editar</Button>
              <Button variant="outlined" color="error" onClick={() => onDeleteRace(selectedRace.id)} startIcon={<DeleteIcon />}>Eliminar</Button>
            </Box>
          </Box>

          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
            <Tab label="Participantes" />
            <Tab label="Categorías" />
            <Tab label="Distancias" />
            <Tab label="Códigos" />
            <Tab label="Llegada" icon={<TimerIcon />} iconPosition="end" />
            <Tab label="Ruta" icon={<MapIcon />} iconPosition="end" />
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
                      <TableCell>Dorsal</TableCell>
                      <TableCell>Nombre</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Teléfono</TableCell>
                      <TableCell>Equipo</TableCell>
                      <TableCell>Categoría</TableCell>
                      <TableCell>Talla</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {participants.map(p => (
                      <TableRow key={p.id}>
                        <TableCell sx={{ fontWeight: 'bold' }}>#{p.bibNumber || '-'}</TableCell>
                        <TableCell>{p.firstName} {p.lastName}</TableCell>
                        <TableCell>{p.email}</TableCell>
                        <TableCell>{p.phone || '-'}</TableCell>
                        <TableCell>{p.teamName || '-'}</TableCell>
                        <TableCell>{getCategoryName(p.categoryId)}</TableCell>
                        <TableCell>{p.size || '-'}</TableCell>
                        <TableCell>
                          <Chip 
                            size="small" 
                            label={p.paymentStatus === 'paid' ? 'Pagado' : 'Pendiente'}
                            sx={{ bgcolor: p.paymentStatus === 'paid' ? 'success.main' : 'warning.main', color: 'white' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button size="small" onClick={() => handleOpenParticipantDialog(p)} startIcon={<EditIcon />}>Editar</Button>
                            <Button size="small" color="error" onClick={() => handleDeleteParticipant(p.id)} startIcon={<DeleteIcon />}>Borrar</Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                    {participants.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} sx={{ textAlign: 'center', py: 4 }}>Sin participantes</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}

          {tab === 1 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="body1" color="text.secondary">
                  {categories.length} categorías configuradas
                </Typography>
                <Button 
                  variant="contained" 
                  onClick={() => handleOpenCategoryDialog()}
                  sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#E55A00' } }}
                  startIcon={<AddIcon />}
                >
                  Nueva Categoría
                </Button>
              </Box>
              <TableContainer component={Paper} elevation={2}>
                <Table>
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell>Nombre</TableCell>
                      <TableCell>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {categories.map(c => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CategoryIcon fontSize="small" color="action" />
                            {c.name}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button size="small" onClick={() => handleOpenCategoryDialog(c)} startIcon={<EditIcon />}>Editar</Button>
                            <Button size="small" color="error" onClick={() => handleDeleteCategory(c.id)} startIcon={<DeleteIcon />}>Eliminar</Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                    {categories.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} sx={{ textAlign: 'center', py: 4 }}>Sin categorías. Agrega categorías para esta carrera.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {tab === 2 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="body1" color="text.secondary">
                  {distances.length} distancias configuradas
                </Typography>
                <Button 
                  variant="contained" 
                  onClick={() => handleOpenDistanceDialog()}
                  sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#E55A00' } }}
                  startIcon={<AddIcon />}
                >
                  Nueva Distancia
                </Button>
              </Box>
              <TableContainer component={Paper} elevation={2}>
                <Table>
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell>Nombre</TableCell>
                      <TableCell>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {distances.map(d => (
                      <TableRow key={d.id}>
                        <TableCell>{d.name}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button size="small" onClick={() => handleOpenDistanceDialog(d)} startIcon={<EditIcon />}>Editar</Button>
                            <Button size="small" color="error" onClick={() => handleDeleteDistance(d.id)} startIcon={<DeleteIcon />}>Eliminar</Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                    {distances.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} sx={{ textAlign: 'center', py: 4 }}>Sin distancias. Agrega distancias para esta carrera.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {tab === 3 && (
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

          {tab === 4 && (
            selectedRace?.status === 'active' ? (
              <FinishLineControl
                raceId={selectedRace.id}
                timerStart={selectedRace.timerStart}
                participants={participants}
                onRecordFinish={handleRecordFinish}
              />
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6" color="text.secondary">
                  La pestaña de контроля de llegada solo está disponible cuando la carrera está activa.
                </Typography>
                {selectedRace && selectedRace.status !== 'active' && (
                  <Button 
                    variant="contained" 
                    onClick={onFinishRace}
                    sx={{ mt: 2, bgcolor: ACCENT }}
                    startIcon={<PlayArrowIcon />}
                  >
                    Iniciar Carrera
                  </Button>
                )}
              </Box>
            )
          )}

          {tab === 5 && selectedRace && (
            <RouteEditor
              routeGeoJson={selectedRace.routeGeoJson}
              onSave={async (geoJson) => {
                try {
                  const res = await fetch(`${API_BASE}/api/admin/race/${selectedRace.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ routeGeoJson: geoJson })
                  });
                  if (res.ok) {
                    showNotification('Ruta guardada correctamente', 'success');
                  } else {
                    showNotification('Error al guardar la ruta', 'error');
                  }
                } catch {
                  showNotification('Error al guardar la ruta', 'error');
                }
              }}
            />
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

      <Dialog open={openCategoryDialog} onClose={() => setOpenCategoryDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editCategory ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField 
            label="Nombre *" 
            value={categoryForm.name} 
            onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})} 
            fullWidth 
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCategoryDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveCategory} disabled={!categoryForm.name} sx={{ bgcolor: ACCENT }}>Guardar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDistanceDialog} onClose={() => setOpenDistanceDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editDistance ? 'Editar Distancia' : 'Nueva Distancia'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField 
            label="Nombre (ej: 5K, 10K, 5K Caminata) *" 
            value={distanceForm.name} 
            onChange={(e) => setDistanceForm({...distanceForm, name: e.target.value})} 
            fullWidth 
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDistanceDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveDistance} disabled={!distanceForm.name} sx={{ bgcolor: ACCENT }}>Guardar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openParticipantDialog} onClose={() => setOpenParticipantDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Participante</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField 
            label="Nombre" 
            value={participantForm.firstName} 
            onChange={(e) => setParticipantForm({...participantForm, firstName: e.target.value})} 
            fullWidth 
          />
          <TextField 
            label="Apellido" 
            value={participantForm.lastName} 
            onChange={(e) => setParticipantForm({...participantForm, lastName: e.target.value})} 
            fullWidth 
          />
          <TextField 
            label="Email" 
            value={participantForm.email} 
            onChange={(e) => setParticipantForm({...participantForm, email: e.target.value})} 
            fullWidth 
          />
          <TextField 
            label="Teléfono" 
            value={participantForm.phone} 
            onChange={(e) => setParticipantForm({...participantForm, phone: e.target.value})} 
            fullWidth 
          />
          <TextField 
            label="Equipo" 
            value={participantForm.teamName} 
            onChange={(e) => setParticipantForm({...participantForm, teamName: e.target.value})} 
            fullWidth 
          />
          <FormControl fullWidth>
            <InputLabel>Estado de Pago</InputLabel>
            <Select
              value={participantForm.paymentStatus}
              label="Estado de Pago"
              onChange={(e) => setParticipantForm({...participantForm, paymentStatus: e.target.value})}
            >
              <MenuItem value="pending">Pendiente</MenuItem>
              <MenuItem value="paid">Pagado</MenuItem>
              <MenuItem value="refunded">Reembolsado</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenParticipantDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveParticipant} sx={{ bgcolor: ACCENT }}>Guardar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!notification} autoHideDuration={4000} onClose={() => setNotification(null)}>
        {notification ? (
          <Alert severity={notification.type} sx={{ width: '100%' }}>
            {notification.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}
