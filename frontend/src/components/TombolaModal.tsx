import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, Box, Typography, Button, IconButton, Paper, Chip, TextField, CircularProgress } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import CameraAltIcon from '@mui/icons-material/CameraAlt';

const ACCENT = '#FF6B00';

const ensureAbsolute = (url: string) => {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  const R2_BASE = 'https://pub-ddaf4243012a44c5a61699bc0719121f.r2.dev';
  if (url.includes('pub-ddaf4243012a44c5a61699bc0719121f.r2.dev')) return url;
  if (url.includes('/uploads/')) {
    const parts = url.split('/uploads/');
    return `${R2_BASE}/uploads/${parts[parts.length - 1]}`;
  }
  if (url.startsWith('/')) return `${R2_BASE}${url}`;
  if (!url.startsWith('http')) return `${R2_BASE}/${url}`;
  return url;
};

interface TombolaModalProps {
  open: boolean;
  onClose: () => void;
  participants: any[];
  raceInfo: any;
  onUpdateRace: (updates: any) => Promise<void>;
}

export default function TombolaModal({ open, onClose, participants, raceInfo, onUpdateRace }: TombolaModalProps) {
  const [filter, setFilter] = useState<'all' | 'm' | 'f' | 'kids'>('all');
  const [isSpinning, setIsSpinning] = useState(false);
  const [displayedName, setDisplayedName] = useState('¿QUIÉN SERÁ EL GANADOR?');
  const [winner, setWinner] = useState<any>(null);
  
  // Winners Memory Cache
  const [winnersCache, setWinnersCache] = useState<any[]>([]);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (open && raceInfo?.data?.raffleWinners) {
      try {
        const parsed = JSON.parse(raceInfo.data.raffleWinners);
        if (Array.isArray(parsed)) setWinnersCache(parsed);
      } catch(e) {
        setWinnersCache([]);
      }
    }
  }, [open, raceInfo]);

  const clearMemory = async () => {
    if (!confirm('¿Seguro que deseas borrar permanentemente el historial de ganadores? Esto no se puede deshacer.')) return;
    setWinnersCache([]);
    setWinner(null);
    setDisplayedName('¿QUIÉN SERÁ EL GANADOR?');
    await onUpdateRace({ raffleWinners: JSON.stringify([]) });
  };

  // Cálculo en vivo del pool para dar retroalimentación visual
  const getActivePool = () => {
    const winnerIds = winnersCache.map(w => w.id);
    return participants.filter((p: any) => {
        if (winnerIds.includes(p.id)) return false;
        if (filter === 'm') return p.gender === 'M' || p.gender === 'Masculino';
        if (filter === 'f') return p.gender === 'F' || p.gender === 'Femenino';
        if (filter === 'kids') return p.categoryName && p.categoryName.toLowerCase().includes('niñ');
        return true;
    });
  };

  const poolSize = getActivePool().length;

  const startRaffle = () => {
    const pool = getActivePool();

    if (pool.length === 0) {
      alert('No hay participantes válidos o habilitados para este filtro (o todos ya ganaron).');
      return;
    }

    // Seleccionar ganador mágico matemático
    const randomWinner = pool[Math.floor(Math.random() * pool.length)];

    setWinner(null);
    setIsSpinning(true);

    // Ruleta Animación
    let ticks = 0;
    const maxTicks = 40; // 40 changes
    const intervalTime = 50; // ms

    const interval = setInterval(() => {
       const fakePick = pool[Math.floor(Math.random() * pool.length)];
       setDisplayedName(`#${fakePick.bibNumber} - ${fakePick.firstName} ${fakePick.lastName}`.toUpperCase());
       ticks++;
       
       if (ticks >= maxTicks) {
          clearInterval(interval);
          finishRaffle(randomWinner);
       }
    }, intervalTime);
  };

  const finishRaffle = async (finalWinner: any) => {
     setWinner(finalWinner);
     setDisplayedName(`🏆 #${finalWinner.bibNumber} - ${finalWinner.firstName} ${finalWinner.lastName} 🏆`.toUpperCase());
     setIsSpinning(false);

     const newCache = [...winnersCache, {
        id: finalWinner.id,
        bibNumber: finalWinner.bibNumber,
        name: `${finalWinner.firstName} ${finalWinner.lastName}`,
        gender: finalWinner.gender || '',
        categoryName: finalWinner.categoryName || '',
        time: new Date().toISOString(),
        prizeName: '',
        prizePhotoUrl: ''
     }];
     setWinnersCache(newCache);
     console.log('Guardando Ganador en SonicJS Backend...');
     await onUpdateRace({ raffleWinners: JSON.stringify(newCache) });
  };

  const handlePrizeNameChange = (index: number, value: string) => {
    const newCache = [...winnersCache];
    newCache[index] = { ...newCache[index], prizeName: value };
    setWinnersCache(newCache);
  };

  const handlePrizeNameBlur = async (index: number, value: string) => {
    const newCache = [...winnersCache];
    newCache[index] = { ...newCache[index], prizeName: value };
    setWinnersCache(newCache);
    await onUpdateRace({ raffleWinners: JSON.stringify(newCache) });
  };

  const triggerFileInput = (index: number) => {
    const fileInput = document.getElementById(`prize-photo-input-${index}`);
    if (fileInput) {
      fileInput.click();
    }
  };

  const handleFileChange = async (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingIndex(index);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64String = reader.result as string;
          const winnerObj = winnersCache[index];
          const cedulaUnique = `raffle-${raceInfo?.id || 'race'}-${winnerObj.id || index}-${Date.now()}`;

          const response = await fetch('/api/upload-photo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: base64String,
              cedula: cedulaUnique
            })
          });

          if (!response.ok) {
            throw new Error('Error al subir la imagen');
          }

          const result = await response.json();
          if (result.success && result.url) {
            const newCache = [...winnersCache];
            newCache[index] = { ...newCache[index], prizePhotoUrl: result.url };
            setWinnersCache(newCache);
            await onUpdateRace({ raffleWinners: JSON.stringify(newCache) });
          } else {
            throw new Error(result.error || 'Respuesta de subida inválida');
          }
        } catch (uploadError: any) {
          alert('Error al subir la foto del premio: ' + uploadError.message);
        } finally {
          setUploadingIndex(null);
        }
      };
      reader.readAsDataURL(file);
    } catch (e: any) {
      alert('Error al procesar el archivo: ' + e.message);
      setUploadingIndex(null);
    }
  };

  const handlePhotoRemove = async (index: number) => {
    if (!confirm('¿Seguro que deseas eliminar la foto de este premio?')) return;
    const newCache = [...winnersCache];
    newCache[index] = { ...newCache[index], prizePhotoUrl: '' };
    setWinnersCache(newCache);
    await onUpdateRace({ raffleWinners: JSON.stringify(newCache) });
  };

  const removeWinner = async (index: number) => {
    if (!confirm('¿Seguro que deseas eliminar a este ganador del historial?')) return;
    const newCache = winnersCache.filter((_, idx) => idx !== index);
    setWinnersCache(newCache);
    await onUpdateRace({ raffleWinners: JSON.stringify(newCache) });
  };

  return (
    <Dialog open={open} onClose={isSpinning ? undefined : onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { bgcolor: '#0f0f0f', border: `2px solid ${ACCENT}`, borderRadius: 4, overflow: 'hidden' } }}>
      {/* Estilos para Confeti Inyectado Nativo */}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .confetti-piece {
          position: fixed;
          top: -20px;
          z-index: 9999;
          width: 15px;
          height: 15px;
          animation: confettiFall 3s linear forwards;
        }
      `}</style>
      
      {/* Generador de Confeti DUMMY */}
      {winner && !isSpinning && (
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 999 }}>
           {Array.from({ length: 80 }).map((_, i) => (
             <Box key={i} className="confetti-piece" sx={{
               left: `${Math.random() * 100}%`,
               bgcolor: ['#FF6B00', '#FFFFFF', '#ffd54f', '#4fc3f7', '#69f0ae'][Math.floor(Math.random() * 5)],
               animationDelay: `${Math.random() * 0.5}s`,
               animationDuration: `${2 + Math.random() * 2}s`
             }} />
           ))}
        </Box>
      )}

      <IconButton disabled={isSpinning} onClick={onClose} sx={{ position: 'absolute', right: 16, top: 16, color: '#fff', zIndex: 10 }}>
        <CloseIcon />
      </IconButton>

      <DialogContent sx={{ p: { xs: 3, md: 6 }, display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '80vh', position: 'relative' }}>
        
        <Typography variant="h3" sx={{ fontWeight: 900, color: '#FFFFFF', mb: 1, textTransform: 'uppercase', letterSpacing: 3, textAlign: 'center' }}>
          Tómbola de <Box component="span" sx={{ color: ACCENT }}>Premios</Box>
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 6, fontWeight: 'bold' }}>{raceInfo?.data?.title}</Typography>

        {/* Panel Central */}
        <Paper elevation={0} sx={{ 
           width: '100%', maxWidth: 800, p: 5, borderRadius: 4, bgcolor: '#1a1a1a', border: '1px solid #333', 
           display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 6, flex: 1, justifyContent: 'center'
        }}>
           <Typography variant={isSpinning || winner ? 'h3' : 'h4'} sx={{ 
              fontWeight: 900, color: winner ? ACCENT : '#FFFFFF', textAlign: 'center', fontFamily: 'monospace',
              textShadow: winner ? `0 0 20px ${ACCENT}55` : 'none',
              transition: 'all 0.2s', wordBreak: 'break-word'
           }}>
             {displayedName}
           </Typography>
           
           {winner && (
             <Chip label={`GANADOR REGISTRADO EXITOSAMENTE`} color="success" sx={{ mt: 3, fontWeight: 'bold' }} />
           )}
        </Paper>

        {/* Controles de Acción */}
        <Box sx={{ width: '100%', maxWidth: 800, display: 'flex', flexDirection: 'column', gap: 3 }}>
           <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
             <Button variant={filter === 'all' ? 'contained' : 'outlined'} onClick={() => setFilter('all')} 
               sx={{ borderColor: ACCENT, bgcolor: filter === 'all' ? ACCENT : 'transparent', color: '#fff', '&:hover': { bgcolor: ACCENT, opacity: 0.8 }, borderRadius: 6, px: 3 }}>
               Todos
             </Button>
             <Button variant={filter === 'm' ? 'contained' : 'outlined'} onClick={() => setFilter('m')} 
               sx={{ borderColor: ACCENT, bgcolor: filter === 'm' ? ACCENT : 'transparent', color: '#fff', '&:hover': { bgcolor: ACCENT, opacity: 0.8 }, borderRadius: 6, px: 3 }}>
               Solo Hombres
             </Button>
             <Button variant={filter === 'f' ? 'contained' : 'outlined'} onClick={() => setFilter('f')} 
               sx={{ borderColor: ACCENT, bgcolor: filter === 'f' ? ACCENT : 'transparent', color: '#fff', '&:hover': { bgcolor: ACCENT, opacity: 0.8 }, borderRadius: 6, px: 3 }}>
               Solo Mujeres
             </Button>
             <Button variant={filter === 'kids' ? 'contained' : 'outlined'} onClick={() => setFilter('kids')} 
               sx={{ borderColor: ACCENT, bgcolor: filter === 'kids' ? ACCENT : 'transparent', color: '#fff', '&:hover': { bgcolor: ACCENT, opacity: 0.8 }, borderRadius: 6, px: 3 }}>
               Solo Niños
             </Button>
           </Box>

           <Button 
             variant="contained" 
             onClick={startRaffle} 
             disabled={isSpinning || poolSize === 0}
             sx={{ py: 3, borderRadius: 10, bgcolor: ACCENT, color: '#fff', '&:hover': { bgcolor: '#E55A00' }, fontWeight: 900, fontSize: '1.5rem', letterSpacing: 2, boxShadow: `0 0 30px ${ACCENT}55` }}
           >
             {isSpinning ? 'GIRANDO...' : '¡SORTEAR GANADOR AHORA!'}
           </Button>
           <Typography variant="body2" sx={{ textAlign: 'center', color: poolSize > 0 ? '#69f0ae' : '#f44336', fontWeight: 'bold' }}>
             {poolSize} finalistas dentro del bombo bajo este filtro
           </Typography>
        </Box>

        {/* Historial Memory */}
        <Box sx={{ width: '100%', maxWidth: 800, mt: 6, p: 3, borderRadius: 3, border: '1px solid #333', bgcolor: '#0f0f0f' }}>
           <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 'bold', textTransform: 'uppercase' }}>
                 Historial Permanente de Ganadores ({winnersCache.length})
              </Typography>
              {winnersCache.length > 0 && (
                <Button size="small" variant="text" color="error" startIcon={<DeleteIcon />} onClick={clearMemory} disabled={isSpinning}>
                  Reiniciar Bombo
                </Button>
              )}
           </Box>
           
           {winnersCache.length === 0 ? (
             <Typography variant="body2" sx={{ color: '#555', fontStyle: 'italic', textAlign: 'center', py: 4 }}>
               Aún no hay ganadores en esta carrera.
             </Typography>
           ) : (
             <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
               {winnersCache.map((w, i) => (
                 <Paper 
                   key={i} 
                   sx={{ 
                     bgcolor: '#161616', 
                     borderRadius: 3, 
                     p: 2.5, 
                     border: '1px solid #2d2d2d',
                     position: 'relative',
                     display: 'flex',
                     flexDirection: 'column',
                     gap: 2,
                     '&:hover': { borderColor: ACCENT }
                   }}
                 >
                   {/* Header */}
                   <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                     <Box sx={{ pr: 4 }}>
                       <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 'bold', lineHeight: 1.2 }}>
                         {w.name}
                       </Typography>
                       <Typography variant="caption" sx={{ color: ACCENT, fontWeight: 'bold', display: 'block', mt: 0.5 }}>
                         DORSAL #{w.bibNumber}
                       </Typography>
                       <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                         {w.gender && (
                           <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                             {w.gender === 'm' || w.gender === 'masculino' || w.gender === 'M' || w.gender === 'Masculino' ? 'Hombre' : w.gender === 'f' || w.gender === 'femenino' || w.gender === 'F' || w.gender === 'Femenino' ? 'Mujer' : w.gender}
                           </Typography>
                         )}
                         {w.categoryName && (
                           <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                             • {w.categoryName}
                           </Typography>
                         )}
                       </Box>
                     </Box>
                     <IconButton 
                       size="small" 
                       color="error" 
                       onClick={() => removeWinner(i)} 
                       disabled={isSpinning}
                       sx={{ position: 'absolute', top: 12, right: 12, bgcolor: 'rgba(255, 23, 68, 0.05)', '&:hover': { bgcolor: 'rgba(255, 23, 68, 0.15)' } }}
                     >
                       <DeleteIcon fontSize="small" />
                     </IconButton>
                   </Box>

                   {/* Inputs */}
                   <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                     <TextField
                       fullWidth
                       size="small"
                       label="Premio Entregado"
                       placeholder="Ej. Zapatillas STRYD, Certificado B/.50..."
                       value={w.prizeName || ''}
                       onChange={(e) => handlePrizeNameChange(i, e.target.value)}
                       onBlur={(e) => handlePrizeNameBlur(i, e.target.value)}
                       onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                       InputLabelProps={{ style: { color: '#888', fontSize: '13px' } }}
                       inputProps={{ style: { color: '#fff', fontSize: '14px' } }}
                       sx={{
                         '& .MuiOutlinedInput-root': {
                           bgcolor: '#0f0f0f',
                           '& fieldset': { borderColor: '#333' },
                           '&:hover fieldset': { borderColor: ACCENT },
                           '&.Mui-focused fieldset': { borderColor: ACCENT },
                         }
                       }}
                     />

                     {/* Photo Section */}
                     <Box>
                       {w.prizePhotoUrl ? (
                         <Box sx={{ position: 'relative', width: '100%', height: 140, borderRadius: 2, overflow: 'hidden', border: '1px solid #333' }}>
                           <Box 
                             component="img" 
                             src={ensureAbsolute(w.prizePhotoUrl)} 
                             alt="Premio" 
                             sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                           />
                           <IconButton 
                             size="small" 
                             onClick={() => handlePhotoRemove(i)} 
                             sx={{ 
                               position: 'absolute', 
                               top: 8, 
                               right: 8, 
                               bgcolor: 'rgba(0,0,0,0.7)', 
                               color: '#fff',
                               '&:hover': { bgcolor: 'rgba(0,0,0,0.9)', color: '#ff1744' } 
                             }}
                           >
                             <DeleteIcon fontSize="small" />
                           </IconButton>
                         </Box>
                       ) : (
                         <Box 
                           sx={{ 
                             width: '100%', 
                             height: 100, 
                             borderRadius: 2, 
                             border: '1px dashed #333', 
                             display: 'flex', 
                             flexDirection: 'column', 
                             alignItems: 'center', 
                             justifyContent: 'center', 
                             cursor: 'pointer',
                             bgcolor: '#0f0f0f',
                             gap: 1,
                             '&:hover': { borderColor: ACCENT, bgcolor: 'rgba(255, 107, 0, 0.02)' },
                             position: 'relative'
                           }}
                           onClick={() => triggerFileInput(i)}
                         >
                           {uploadingIndex === i ? (
                             <CircularProgress size={24} sx={{ color: ACCENT }} />
                           ) : (
                             <>
                               <CameraAltIcon sx={{ color: '#555' }} />
                               <Typography variant="caption" sx={{ color: '#888', fontWeight: 'bold' }}>
                                 Subir Foto del Ganador
                               </Typography>
                             </>
                           )}
                           <input 
                             type="file" 
                             id={`prize-photo-input-${i}`}
                             accept="image/*" 
                             style={{ display: 'none' }} 
                             onChange={(e) => handleFileChange(i, e)} 
                           />
                         </Box>
                       )}
                     </Box>
                   </Box>
                 </Paper>
               ))}
             </Box>
           )}
        </Box>

      </DialogContent>
    </Dialog>
  );
}
