import React, { useMemo, useState } from 'react';
import { Box, Card, Typography, Grid2 as Grid, useTheme, Button, IconButton, Paper, Divider } from '@mui/material';
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
  
  // -- KPIs --
  const kpis = useMemo(() => {
    let totalInscritos = participants.length;
    let pagosConfirmados = 0;
    let pagosPendientes = 0;
    
    let baseRevenue = 0;
    let platformFeeRevenue = 0;

    // Obtener configuración de plataforma de la carrera actual
    const currentRaceObj = races.find(r => r.id === selectedRace);
    const feeConfig = currentRaceObj?.data?.platformFee ?? 0.45;

    participants.forEach(p => {
       const isConfirmed = p.paymentStatus === 'Confirmado' || p.paymentStatus === 'Completado' || p.paymentStatus === 'Yappy';
       if (isConfirmed) pagosConfirmados++;
       else pagosPendientes++;

       // Buscar el costo real de la distancia
       const distObj = allDistances.find(d => d.id === p.distance);
       let basePrice = distObj?.price ?? currentRaceObj?.data?.price ?? 0;

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
      baseRevenue, 
      platformFeeRevenue,
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

      {/* Analytics Row */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: showSizes ? '1fr 1fr' : '1fr' }, gap: 3, mb: 4 }}>
        {/* Genero Pie Chart */}
        <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}>
           <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 3, textAlign: 'center', color: 'text.primary' }}>Corredores por Sexo</Typography>
           <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
             <Box sx={{ 
                width: 150, height: 150, borderRadius: '50%', 
                background: `conic-gradient(${ACCENT} 0% ${(stats.genders.m / Math.max(kpis.totalInscritos, 1))*100}%, ${(theme => theme.palette?.mode === 'dark' ? '#FFFFFF' : '#e0e0e0')} ${(stats.genders.m / Math.max(kpis.totalInscritos, 1))*100}% ${((stats.genders.m + stats.genders.f) / Math.max(kpis.totalInscritos, 1))*100}%, #777777 ${((stats.genders.m + stats.genders.f) / Math.max(kpis.totalInscritos, 1))*100}% 100%)` 
             }} />
             <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.primary' }}><Box sx={{ width: 12, height: 12, bgcolor: ACCENT }}/> Masculino ({stats.genders.m})</Typography>
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.primary' }}><Box sx={{ width: 12, height: 12, border: 1, borderColor: 'divider', bgcolor: (theme => theme.palette?.mode === 'dark' ? '#FFFFFF' : '#e0e0e0') }}/> Femenino ({stats.genders.f})</Typography>
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.primary' }}><Box sx={{ width: 12, height: 12, bgcolor: '#777777' }}/> N/E ({stats.genders.u})</Typography>
             </Box>
           </Box>
        </Paper>

        {/* Tallas Bar Chart (Condicional) */}
        {showSizes && (
        <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}>
           <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 3, textAlign: 'center', color: 'text.primary' }}>Conteo por Tallas (Logística)</Typography>
           <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 2, height: 150, borderBottom: 1, borderColor: 'divider' }}>
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

        {/* Categorias Horizontal Bar Chart */}
        <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', gridColumn: '1 / -1', border: 1, borderColor: 'divider' }}>
           <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 3, color: 'text.primary' }}>Corredores por Categoría</Typography>
           <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {Object.entries(stats.cats).sort((a,b) => b[1] - a[1]).map(([cat, count]) => (
                <Box key={cat} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" sx={{ width: 150, textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'text.primary', fontWeight: 'bold' }}>{cat}</Typography>
                  <Box sx={{ flex: 1, height: 16, bgcolor: 'action.hover', borderRadius: 6, position: 'relative', overflow: 'hidden' }}>
                     <Box sx={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${(count / Math.max(kpis.totalInscritos, 1)) * 100}%`, bgcolor: ACCENT, borderRadius: 6 }} />
                  </Box>
                  <Typography variant="subtitle2" sx={{ width: 40, color: 'text.primary', fontWeight: 900 }}>{count} pax</Typography>
                </Box>
              ))}
           </Box>
        </Paper>
      </Box>

    </Box>
  );
}
