import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, Box, Typography, Button, IconButton, Paper, List, ListItem, Chip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';

const ACCENT = '#FF6B00';

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

  const startRaffle = () => {
    // 1. Filtrar Participantes viables
    const winnerIds = winnersCache.map(w => w.id);
    let pool = participants.filter((p: any) => {
        // Excluir si ya ganó
        if (winnerIds.includes(p.id)) return false;
        
        // Excluir si no cumple pago efectivo o cortesía (Confirmado)
        // Puedes relajar esto según tu preferencia, pero por seguridad general solo confirmados juegan.
        const isPaid = ['Confirmado', 'Completado', 'Yappy'].includes(p.paymentStatus);
        if (!isPaid) return false;

        // Filtro demográfico
        if (filter === 'm') return p.gender === 'M' || p.gender === 'Masculino';
        if (filter === 'f') return p.gender === 'F' || p.gender === 'Femenino';
        if (filter === 'kids') return p.categoryName && p.categoryName.toLowerCase().includes('niñ');
        return true;
    });

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
        time: new Date().toISOString()
     }];
     setWinnersCache(newCache);
     console.log('Guardando Ganador en SonicJS Backend...');
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
             disabled={isSpinning}
             sx={{ py: 3, borderRadius: 10, bgcolor: ACCENT, color: '#fff', '&:hover': { bgcolor: '#E55A00' }, fontWeight: 900, fontSize: '1.5rem', letterSpacing: 2, boxShadow: `0 0 30px ${ACCENT}55` }}
           >
             {isSpinning ? 'GIRANDO...' : '¡SORTEAR GANADOR AHORA!'}
           </Button>
        </Box>

        {/* Historial Memory */}
        <Box sx={{ width: '100%', maxWidth: 800, mt: 6, p: 3, borderRadius: 3, border: '1px solid #333', bgcolor: '#0f0f0f' }}>
           <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
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
             <Typography variant="body2" sx={{ color: '#555', fontStyle: 'italic', textAlign: 'center' }}>Aún no hay ganadores en esta carrera.</Typography>
           ) : (
             <List dense disablePadding sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
               {winnersCache.map((w, i) => (
                 <ListItem key={i} sx={{ bgcolor: '#1a1a1a', borderRadius: 2, p: 1, border: '1px solid #2d2d2d' }}>
                   <Typography variant="caption" sx={{ color: '#fff', fontWeight: 'bold' }}>#{w.bibNumber} - {w.name}</Typography>
                 </ListItem>
               ))}
             </List>
           )}
        </Box>

      </DialogContent>
    </Dialog>
  );
}
