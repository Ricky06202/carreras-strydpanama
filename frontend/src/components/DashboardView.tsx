import React, { useMemo, useState } from 'react';
import { Box, Card, Typography, Grid2 as Grid, useTheme, Button, IconButton, Paper, Divider, List, ListItem, ListItemText, Select, MenuItem } from '@mui/material';
import TombolaModal from './TombolaModal';

const ACCENT = '#FF6B00';

interface DashboardViewProps {
  races: any[];
  allDistances: any[];
  participants: any[];
  onFetchRaceData: (raceId: string) => void;
  selectedRace: string;
  onUpdateRace?: (id: string, updates: any) => Promise<void>;
}

export default function DashboardView({ races, allDistances, participants, onFetchRaceData, selectedRace, onUpdateRace }: DashboardViewProps) {
  
  const [tombolaOpen, setTombolaOpen] = useState(false);
  const [bdayMonth, setBdayMonth] = useState<number>(new Date().getMonth());
  
  // -- KPIs --
  const kpis = useMemo(() => {
    let totalInscritos = participants.length;
    let pagosConfirmados = 0;
    let pagosPendientes = 0;
    
    let baseRevenue = 0;
    let platformFeeRevenue = 0;

    // Obtener configuración de plataforma de la carrera actual
    const currentRaceObj = races.find(r => r.id === selectedRace);
    const feeConfigRaw = currentRaceObj?.data?.platformFee;
    const feeConfig = (feeConfigRaw !== undefined && feeConfigRaw !== '' && !isNaN(Number(feeConfigRaw))) ? Number(feeConfigRaw) : 0.45;

    participants.forEach(p => {
       const isConfirmed = p.paymentStatus === 'Confirmado' || p.paymentStatus === 'Completado' || p.paymentStatus === 'Yappy';
       if (isConfirmed) pagosConfirmados++;
       else pagosPendientes++;

       // Buscar el costo real de la distancia
       const distObj = allDistances.find(d => d.id === p.distance);
       let basePriceRaw = distObj?.price ?? currentRaceObj?.data?.price ?? 0;
       let basePrice = Number(basePriceRaw) || 0;

       // Factor de Equipos (Para no multiplicar pagos de grupo)
       if (p.registrationType === 'team') basePrice = basePrice / 4;

       if (isConfirmed) {
         baseRevenue += basePrice;
         if (p.paymentStatus === 'Yappy' || p.paymentStatus === 'Confirmado') {
           platformFeeRevenue += feeConfig; // Solo se cobra fee a los confirmados (usualmente yappy)
         }
       }
    });

    return { 
      totalInscritos, 
      pagosConfirmados, 
      pagosPendientes, 
      baseRevenue: baseRevenue || 0, 
      platformFeeRevenue: platformFeeRevenue || 0,
      totalAdeudado: pagosPendientes * 15 // Mock standard para deuda estimada, o recalcular si quisieramos
    };
  }, [participants, allDistances, races, selectedRace]);

  // -- Data Aggregation --
  const stats = useMemo(() => {
     let genders = { m: 0, f: 0, u: 0 };
     let modalities = { presencial: 0, virtual: 0 }; // Ej. Mock basado en distancia
     let sizes: Record<string, number> = {};
     let cats: Record<string, number> = {};

     participants.forEach(p => {
        // Genero
        if (p.gender === 'M' || p.gender === 'Masculino') genders.m++;
        else if (p.gender === 'F' || p.gender === 'Femenino') genders.f++;
        else genders.u++;

        // Categorias
        if (p.categoryName) {
           cats[p.categoryName] = (cats[p.categoryName] || 0) + 1;
        }

        // Tallas
        const size = p.size || 'N/A';
        sizes[size] = (sizes[size] || 0) + 1;
     });

     return { genders, modalities, sizes, cats };
  }, [participants]);

  const birthdays = useMemo(() => {
    return participants.filter((p: any) => {
      if (!p.birthDate || typeof p.birthDate !== 'string') return false;
      const bdayParts = p.birthDate.split('-');
      if (bdayParts.length === 3) {
        const monthIndex = parseInt(bdayParts[1], 10) - 1; // 0-based
        return monthIndex === bdayMonth;
      }
      return false;
    }).sort((a: any, b: any) => {
      // Sort by day
      const dayA = parseInt(a.birthDate.split('-')[2], 10);
      const dayB = parseInt(b.birthDate.split('-')[2], 10);
      return dayA - dayB;
    });
  }, [participants, bdayMonth]);

  const kpiCard = (title: string, value: string | number, color: string = 'text.primary', subtitle?: string, highlightBorder?: boolean) => (
    <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', border: 1, borderColor: highlightBorder ? ACCENT : 'divider' }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 'bold', mb: 1, display: 'block', textTransform: 'uppercase', letterSpacing: 1 }}>{title}</Typography>
      <Typography variant="h3" sx={{ fontWeight: 900, color }}>{value}</Typography>
      {subtitle && <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block' }}>{subtitle}</Typography>}
    </Paper>
  );

  const currentRaceObj = races.find(r => r.id === selectedRace);
  const showSizes = currentRaceObj?.data?.showShirtSize;

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
           <Typography variant="h4" sx={{ fontWeight: 900, mb: 0.5, color: ACCENT }}>Dashboard Financiero y Logístico</Typography>
           <Typography variant="body2" color="text.secondary">Métricas en tiempo real de la carrera seleccionada.</Typography>
        </Box>
        <select 
          style={{ padding: '10px 15px', borderRadius: 8, backgroundColor: 'var(--mui-palette-background-paper, #2d2d2d)', color: 'inherit', border: `1px solid ${ACCENT}`, outline: 'none' }}
          value={selectedRace} 
          onChange={(e) => onFetchRaceData(e.target.value)}
        >
          <option value="">-- Selecciona una Carrera --</option>
          {races.map(r => <option key={r.id} value={r.id}>{r.data?.title || r.title}</option>)}
        </select>
      </Box>

      {/* KPIs Row */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ color: ACCENT, fontWeight: 'bold', mb: 2 }}>Finanzas (KPIs)</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
          {kpiCard('Total Inscritos', kpis.totalInscritos, 'text.primary')}
          {kpiCard('Pagos Confirmados', kpis.pagosConfirmados, ACCENT, `De ${kpis.totalInscritos} participantes`, true)}
          {kpiCard('Pagos Pendientes', kpis.pagosPendientes, 'text.primary', 'Requieren validación o pago físico')}
          
          {kpiCard('Recaudación Neta Carrera', `B/. ${kpis.baseRevenue.toFixed(2)}`, 'text.primary')}
          {kpiCard('Recolección de Plataforma', `B/. ${(kpis.platformFeeRevenue).toFixed(2)}`, 'text.secondary', 'Asignados a comisiones o costos')}
          {kpiCard('Monto Pendiente (Aprox)', `B/. ${kpis.totalAdeudado.toFixed(2)}`, 'text.primary')}
        </Box>
      </Box>

      {/* Button Row */}
      <Button disabled={!selectedRace} onClick={() => setTombolaOpen(true)} variant="contained" fullWidth sx={{ py: 2, mb: 4, borderRadius: 3, bgcolor: ACCENT, color: '#FFFFFF', '&:hover': { bgcolor: '#E55A00' }, fontWeight: 900, fontSize: '1.2rem', letterSpacing: 2 }}>
        🏆 IR A TÓMBOLA DE PREMIOS 🏆
      </Button>
      
      <TombolaModal 
        open={tombolaOpen} 
        onClose={() => setTombolaOpen(false)} 
        participants={participants} 
        raceInfo={currentRaceObj} 
        onUpdateRace={async (updates: any) => {
           if (onUpdateRace && selectedRace) {
             await onUpdateRace(selectedRace, updates);
           }
        }}
      />

      {/* Analytics Row 1: Genero & Cumpleañeros */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 4 }}>
        {/* Genero Lista */}
        <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}>
           <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 3, color: 'text.primary' }}>Corredores por Sexo</Typography>
           <List disablePadding>
             <ListItem sx={{ borderBottom: 1, borderColor: 'divider', px: 0, pt: 0 }}>
               <ListItemText primary="Masculino" primaryTypographyProps={{ fontWeight: 'bold', color: 'text.secondary' }} />
               <Typography variant="h6" fontWeight="bold">{stats.genders.m}</Typography>
             </ListItem>
             <ListItem sx={{ borderBottom: 1, borderColor: 'divider', px: 0 }}>
               <ListItemText primary="Femenino" primaryTypographyProps={{ fontWeight: 'bold', color: 'text.secondary' }} />
               <Typography variant="h6" fontWeight="bold">{stats.genders.f}</Typography>
             </ListItem>
             <ListItem sx={{ px: 0, pb: 0 }}>
               <ListItemText primary="No Especificado / Otros" primaryTypographyProps={{ fontWeight: 'bold', color: 'text.secondary' }} />
               <Typography variant="h6" fontWeight="bold">{stats.genders.u}</Typography>
             </ListItem>
           </List>
        </Paper>

        {/* Cumpleañeros Lista */}
        <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', border: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
           <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
             <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'text.primary' }}>Cumpleañeros</Typography>
             <Select
               size="small"
               value={bdayMonth}
               onChange={(e) => setBdayMonth(Number(e.target.value))}
               sx={{ minWidth: 120, borderRadius: 2 }}
             >
               {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
                 <MenuItem key={i} value={i}>{m}</MenuItem>
               ))}
             </Select>
           </Box>
           
           <Box sx={{ flex: 1, maxHeight: 180, overflowY: 'auto', pr: 1 }}>
             {birthdays.length === 0 ? (
               <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center', fontStyle: 'italic' }}>No hay cumpleañeros registrados en este mes.</Typography>
             ) : (
               <List dense disablePadding>
                 {birthdays.map((p: any, i: number) => {
                   const day = parseInt(p.birthDate.split('-')[2], 10);
                   return (
                     <ListItem key={i} sx={{ px: 0, borderBottom: '1px dashed', borderColor: 'divider' }}>
                       <ListItemText 
                          primary={`${p.firstName} ${p.lastName}`} 
                          secondary={`Dorsal #${p.bibNumber || 'Pendiente'}`}
                          primaryTypographyProps={{ fontWeight: 'bold', color: 'text.primary' }} 
                       />
                       <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', bgcolor: 'background.default', border: `1px solid ${ACCENT}`, borderRadius: 2, px: 1.5, py: 0.5 }}>
                          <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1, fontSize: '0.65rem' }}>Día</Typography>
                          <Typography variant="body1" sx={{ color: ACCENT, fontWeight: 900, lineHeight: 1 }}>{day}</Typography>
                       </Box>
                     </ListItem>
                   )
                 })}
               </List>
             )}
           </Box>
        </Paper>
      </Box>

      {/* Analytics Row 2: Tallas y Categorias */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: showSizes ? '1fr 1fr' : '1fr' }, gap: 3, mb: 4 }}>
        {/* Tallas Bar Chart (Condicional) */}
        {showSizes && (
        <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}>
           <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 3, textAlign: 'center', color: 'text.primary' }}>Conteo por Tallas (Logística)</Typography>
           <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 2, height: 180, borderBottom: 1, borderColor: 'divider' }}>
              {Object.entries(stats.sizes).map(([talla, count]) => {
                 const height = Math.max((count / Math.max(kpis.totalInscritos, 1)) * 100, 5);
                 return (
                   <Box key={talla} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 40 }}>
                     <Typography variant="caption" sx={{ mb: 1, color: 'text.primary', fontWeight: 'bold' }}>{count}</Typography>
                     <Box sx={{ width: 30, height: `${height}%`, bgcolor: ACCENT, borderTopLeftRadius: 4, borderTopRightRadius: 4, transition: 'height 0.5s ease' }} />
                     <Typography variant="caption" sx={{ mt: 1, display: 'block', pb: 1, color: 'text.primary' }}>{talla}</Typography>
                   </Box>
                 )
              })}
           </Box>
        </Paper>
        )}

        {/* Categorias List */}
        <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', gridColumn: '1 / -1', border: 1, borderColor: 'divider' }}>
           <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 3, color: 'text.primary' }}>Corredores por Categoría</Typography>
           <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {Object.entries(stats.cats).sort((a,b) => b[1] - a[1]).map(([cat, count]) => (
                <ListItem key={cat} sx={{ bgcolor: 'action.hover', borderRadius: 2, px: 2, py: 1 }}>
                  <ListItemText 
                    primary={cat} 
                    primaryTypographyProps={{ fontWeight: 'bold', color: 'text.primary' }} 
                  />
                  <Typography variant="subtitle1" sx={{ color: ACCENT, fontWeight: 900 }}>{count} pax</Typography>
                </ListItem>
              ))}
           </List>
        </Paper>
      </Box>

    </Box>
  );
}
