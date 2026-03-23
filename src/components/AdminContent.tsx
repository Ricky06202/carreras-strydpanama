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
import AddIcon from '@mui/icons-material/Add';
import CategoryIcon from '@mui/icons-material/Category';

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
  categoryId: string | null;
  team: string | null;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  priceAdjustment: number;
  maxParticipants: number | null;
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
  onStartRace: () => void;
  onEditRace: (race: Race) => void;
  onDeleteRace: (id: string) => void;
  onExportCSV: () => void;
  onGenerateCodes: (count: number) => void;
  onCreateCategory: (data: Partial<Category>) => void;
  onUpdateCategory: (id: string, data: Partial<Category>) => void;
  onDeleteCategory: (id: string) => void;
}

export default function AdminContent({ 
  selectedRace, 
  participants, 
  codes,
  categories,
  onStartRace, 
  onEditRace, 
  onDeleteRace, 
  onExportCSV,
  onGenerateCodes,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory
}: AdminContentProps) {
  const [tab, setTab] = useState(0);
  const [openCodesDialog, setOpenCodesDialog] = useState(false);
  const [codesCount, setCodesCount] = useState(10);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [openCategoryDialog, setOpenCategoryDialog] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', priceAdjustment: 0, maxParticipants: '' });

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
      setCategoryForm({
        name: category.name,
        description: category.description || '',
        priceAdjustment: category.priceAdjustment,
        maxParticipants: category.maxParticipants?.toString() || ''
      });
    } else {
      setEditCategory(null);
      setCategoryForm({ name: '', description: '', priceAdjustment: 0, maxParticipants: '' });
    }
    setOpenCategoryDialog(true);
  };

  const handleSaveCategory = () => {
    const data = {
      name: categoryForm.name,
      description: categoryForm.description || null,
      priceAdjustment: categoryForm.priceAdjustment,
      maxParticipants: categoryForm.maxParticipants ? parseInt(categoryForm.maxParticipants) : null
    };
    
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
            <Tab label="Categorías" />
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
                      <TableCell>Equipo</TableCell>
                      <TableCell>Categoría</TableCell>
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
                        <TableCell>{p.team || '-'}</TableCell>
                        <TableCell>{getCategoryName(p.categoryId)}</TableCell>
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
                        <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>Sin participantes</TableCell>
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
                      <TableCell>Descripción</TableCell>
                      <TableCell>Ajuste de Precio</TableCell>
                      <TableCell>Cupo</TableCell>
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
                        <TableCell>{c.description || '-'}</TableCell>
                        <TableCell>
                          <Chip 
                            size="small" 
                            label={c.priceAdjustment === 0 ? 'Sin ajuste' : `${c.priceAdjustment > 0 ? '+' : ''}$${c.priceAdjustment}`}
                            sx={{ bgcolor: c.priceAdjustment < 0 ? 'success.main' : c.priceAdjustment > 0 ? 'warning.main' : 'grey.500', color: 'white' }}
                          />
                        </TableCell>
                        <TableCell>{c.maxParticipants || 'Ilimitado'}</TableCell>
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
                        <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4 }}>Sin categorías. Agrega categorías para esta carrera.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {tab === 2 && (
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

      <Dialog open={openCategoryDialog} onClose={() => setOpenCategoryDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editCategory ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField 
            label="Nombre *" 
            value={categoryForm.name} 
            onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})} 
            fullWidth 
          />
          <TextField 
            label="Descripción" 
            value={categoryForm.description} 
            onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})} 
            multiline 
            rows={2}
            fullWidth 
          />
          <TextField 
            label="Ajuste de Precio ($)" 
            type="number"
            value={categoryForm.priceAdjustment} 
            onChange={(e) => setCategoryForm({...categoryForm, priceAdjustment: parseInt(e.target.value) || 0})} 
            fullWidth 
            helperText="Positivo = recargo, Negativo = descuento"
          />
          <TextField 
            label="Cupo Máximo (opcional)" 
            type="number"
            value={categoryForm.maxParticipants} 
            onChange={(e) => setCategoryForm({...categoryForm, maxParticipants: e.target.value})} 
            fullWidth 
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCategoryDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveCategory} disabled={!categoryForm.name} sx={{ bgcolor: ACCENT }}>Guardar</Button>
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
