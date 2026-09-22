'use client';

import React, { useState, useEffect, useRef } from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'btn-yappy': any;
    }
  }
}

import {
  Box, Typography, Button, Paper, Alert, Snackbar, Select, MenuItem,
  FormControl, InputLabel, CircularProgress, ThemeProvider, createTheme, CssBaseline
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const ACCENT = '#FF6B00';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: ACCENT },
    background: { default: '#0f0f0f', paper: '#1a1a1a' },
  },
});

interface Props {
  participant: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    cedula: string;
    phone: string;
    birthDate: string;
    size: string;
    confirmationCode: string;
  };
  race: { id: string; title: string; date?: string; platformFee?: number; price?: number };
  distance: { name?: string; price?: number };
  category: { name?: string };
}

export default function CompleteRegistration({ participant, race, distance, category }: Props) {
  const [paymentMethod, setPaymentMethod] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [done, setDone] = useState(false);
  const [assignedBib, setAssignedBib] = useState<number | null>(null);
  const yappyBtnRef = useRef<any>(null);

  const basePrice = distance?.price ?? race?.price ?? 0;
  const platformFee = paymentMethod === 'yappy' ? (race?.platformFee ?? 0.45) : 0;
  const total = basePrice + platformFee;

  const resizeImage = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 800;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = (height / width) * MAX; width = MAX; }
          else { width = (width / height) * MAX; height = MAX; }
        }
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const payUrl = (method: string) => ({
    participantId: participant.id,
    cedula: participant.cedula,
    confirmationCode: participant.confirmationCode,
    paymentMethod: method,
    email: participant.email,
  });

  const handleUploadReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const base64 = await resizeImage(file);
      const res = await fetch('/api/upload-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, cedula: participant.cedula + '_receipt_complete' })
      });
      const data = await res.json();
      if (data.mediaId) setReceiptUrl(data.mediaId);
      else throw new Error(data.error || 'Error subiendo el comprobante');
    } catch (err: any) {
      setError(err.message || 'Error subiendo el comprobante');
    }
    setUploading(false);
  };

  const finishTransfer = async () => {
    if (!receiptUrl) { setError('Debes subir el comprobante de tu transferencia.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/complete-registration-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payUrl('transfer'), receiptUrl })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Error al completar la inscripción');
      setAssignedBib(data.assignedBib || null);
      setDone(true);
    } catch (err: any) {
      setError(err.message || 'Error al completar la inscripción');
    }
    setLoading(false);
  };

  const fetchAssignedBib = async () => {
    try {
      const res = await fetch('/api/complete-registration-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payUrl('yappy'))
      });
      const data = await res.json();
      if (data.assignedBib) setAssignedBib(data.assignedBib);
    } catch {}
  };

  useEffect(() => {
    const bp = yappyBtnRef.current;
    if (!bp) return;

    const handleYappyClick = async () => {
      setLoading(true);
      setError('');
      setInfo('');
      try {
        const resInit = await fetch('/api/complete-registration-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payUrl('yappy'), totalAmount: total })
        });
        const dataInit = await resInit.json();
        if (!dataInit.success) throw new Error(dataInit.error || 'Error iniciando la orden de pago');

        const orderId = dataInit.orderId || dataInit.confirmationCode;
        localStorage.setItem('stryd_pending_yappy', JSON.stringify({ code: orderId, timestamp: Date.now() }));

        const telYappy = (participant.phone || '').replace(/\D/g, '');
        const resCheck = await fetch('/api/yappy/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, total, telefono: telYappy })
        });
        const paymentData = await resCheck.json();
        if (!paymentData.success) throw new Error(paymentData.error || 'Error al generar el pago Yappy');

        setLoading(false);
        setTimeout(() => {
          bp.eventPayment({ ...paymentData.body });
        }, 50);
      } catch (err: any) {
        console.error('Yappy upgrade error:', err);
        setError(err.message || 'Error iniciando el pago de Yappy');
        setLoading(false);
      }
    };

    const handleYappySuccess = async (e: any) => {
      setInfo('¡Pago Yappy exitoso! Confirmando tu inscripción...');
      setLoading(true);
      try {
        const transactionId = e?.detail?.transactionId || e?.transactionId || null;
        const stored = localStorage.getItem('stryd_pending_yappy');
        let code = '';
        try { code = stored ? (JSON.parse(stored)?.code || '') : ''; } catch {}
        await fetch('/api/yappy/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: code, transactionId })
        });
        localStorage.removeItem('stryd_pending_yappy');
        await fetchAssignedBib();
        setDone(true);
      } catch (err: any) {
        console.error('[Yappy] Safety net confirm falló (webhook debería procesarlo):', err);
        setDone(true);
      }
      setLoading(false);
    };

    const handleYappyCancel = () => {
      setLoading(false);
      setInfo('');
      setError('Pago cancelado o interrumpido.');
    };

    bp.addEventListener('eventClick', handleYappyClick);
    bp.addEventListener('eventSuccess', handleYappySuccess);
    bp.addEventListener('eventCancel', handleYappyCancel);

    return () => {
      bp.removeEventListener('eventClick', handleYappyClick);
      bp.removeEventListener('eventSuccess', handleYappySuccess);
      bp.removeEventListener('eventCancel', handleYappyCancel);
    };
  }, [paymentMethod, total, participant.id]);

  if (done) {
    return (
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <Paper sx={{ p: { xs: 3, md: 5 }, borderRadius: 4, bgcolor: 'background.paper', border: `1px solid ${ACCENT}80`, textAlign: 'center', mt: 4 }}>
          <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>¡Inscripción Completada!</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {participant.firstName} {participant.lastName}, tu inscripción para <b>{race.title}</b> ha sido oficializada.
          </Typography>

          <Box sx={{ bgcolor: 'action.hover', p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', maxWidth: 420, mx: 'auto' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Dorsal Asignado</Typography>
            <Typography variant="h3" sx={{ color: ACCENT, fontWeight: 'bold', mb: 2 }}>
              {assignedBib ? `#${assignedBib}` : '—'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Distancia: <b>{distance?.name || 'General'}</b></Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Categoría: <b>{category?.name || 'General'}</b></Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Código: <b style={{ fontFamily: 'monospace' }}>{participant.confirmationCode}</b></Typography>
            <Typography variant="body2" color="text.secondary">
              Estado: <b style={{ color: '#2e7d32' }}>{paymentMethod === 'yappy' ? 'Pagado (Yappy)' : 'Pago pendiente de validación'}</b>
            </Typography>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
            Te enviamos un correo a <b>{participant.email}</b> con los detalles. También puedes consultar tu estado en <b>"Mis Inscripciones"</b>.
          </Typography>

          <Button
            variant="contained"
            onClick={() => window.location.href = '/mis-inscripciones'}
            sx={{ mt: 3, bgcolor: ACCENT, borderRadius: 8, px: 4, '&:hover': { bgcolor: '#E55A00' } }}
          >
            Ir a Mis Inscripciones
          </Button>
        </Paper>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Paper sx={{ p: { xs: 3, md: 5 }, borderRadius: 4, bgcolor: 'background.paper', border: `1px solid ${ACCENT}80`, mt: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>Completar mi Inscripción</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Estás preinscrito(a). Completa tu método de pago para que te asignemos tu número de dorsal de forma inmediata.
        </Typography>

        {/* Resumen */}
        <Box sx={{ bgcolor: 'action.hover', p: 2.5, borderRadius: 2, border: '1px dashed rgba(255,107,0,0.4)', mb: 3 }}>
          <Typography variant="subtitle2" sx={{ color: ACCENT, fontWeight: 'bold', mb: 1, textTransform: 'uppercase', letterSpacing: 1 }}>
            Resumen de tu preinscripción
          </Typography>
          <Typography variant="body2">Carrera: <b>{race.title || '-'}</b></Typography>
          <Typography variant="body2">Participante: <b>{participant.firstName} {participant.lastName}</b></Typography>
          <Typography variant="body2">Distancia: <b>{distance?.name || 'General'}</b></Typography>
          <Typography variant="body2">Categoría: <b>{category?.name || 'General'}</b></Typography>
          <Typography variant="body2" sx={{ mt: 1, color: ACCENT, fontWeight: 'bold' }}>Total a pagar: ${total.toFixed(2)}</Typography>
          {paymentMethod === 'yappy' && (
            <Typography variant="caption" color="text.secondary">Incluye cargo de plataforma Yappy: +${(race?.platformFee ?? 0.45).toFixed(2)}</Typography>
          )}
        </Box>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Método de Pago *</InputLabel>
          <Select
            value={paymentMethod}
            label="Método de Pago *"
            onChange={(e) => { setPaymentMethod(e.target.value); setError(''); }}
          >
            <MenuItem value="yappy">Yappy</MenuItem>
            <MenuItem value="transfer">Transferencia Bancaria</MenuItem>
          </Select>
        </FormControl>

        {paymentMethod === 'transfer' && (
          <Box sx={{ bgcolor: 'rgba(255,107,0,0.08)', border: `1.5px solid ${ACCENT}`, p: 2.5, borderRadius: 2, mb: 2 }}>
            <Typography variant="subtitle2" sx={{ color: ACCENT, fontWeight: 'bold', mb: 1.5 }}>
              🏦 Datos para Transferencia Bancaria
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed rgba(255,107,0,0.3)', pb: 0.75 }}>
                <Typography variant="body2" color="text.secondary">Banco:</Typography>
                <Typography variant="body2" fontWeight="bold">Banco General</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed rgba(255,107,0,0.3)', pb: 0.75 }}>
                <Typography variant="body2" color="text.secondary">Tipo de cuenta:</Typography>
                <Typography variant="body2" fontWeight="bold">Cuenta Corriente</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed rgba(255,107,0,0.3)', pb: 0.75 }}>
                <Typography variant="body2" color="text.secondary">Número de cuenta:</Typography>
                <Typography variant="body2" fontWeight="bold" sx={{ fontFamily: 'monospace', letterSpacing: 1 }}>03-30-01-125532-9</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">A nombre de:</Typography>
                <Typography variant="body2" fontWeight="bold" textAlign="right">TOPOGRAFIA ESPECIALIZADA, S.A.</Typography>
              </Box>
            </Box>
            <Alert severity="info" sx={{ mt: 2, fontSize: '0.75rem' }}>
              Sube tu comprobante abajo. Al confirmar se te asignará tu dorsal; nuestro equipo validará el pago y lo oficializará.
            </Alert>
          </Box>
        )}

        {paymentMethod === 'transfer' && (
          <Box sx={{ bgcolor: 'action.hover', p: 3, borderRadius: 2, border: '1px dashed #ccc', mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>1. Comprobante de Transferencia *</Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>Sube la captura de tu transferencia bancaria o billete de depósito.</Typography>
            <Button variant="outlined" component="label" sx={{ color: ACCENT, borderColor: ACCENT }}>
              Seleccionar Imagen
              <input type="file" hidden accept="image/*" onChange={handleUploadReceipt} />
            </Button>
            {uploading && <Typography variant="caption" sx={{ display: 'block', mt: 1, color: ACCENT }}>Subiendo...</Typography>}
            {receiptUrl && <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'success.main' }}>✅ Comprobante cargado correctamente</Typography>}

            <Button
              variant="contained"
              fullWidth
              onClick={finishTransfer}
              disabled={loading || uploading || !receiptUrl}
              sx={{ mt: 3, bgcolor: ACCENT, fontWeight: 'bold', '&:hover': { bgcolor: '#E55A00' } }}
            >
              {loading ? 'Procesando...' : 'Oficializar Mi Inscripción (Asignarme Dorsal)'}
            </Button>
          </Box>
        )}

        {paymentMethod === 'yappy' && (
          <Box sx={{ mt: 2 }}>
            <Alert severity="info" sx={{ mb: 2, fontSize: '0.8rem' }}>
              Al pagar con Yappy tu inscripción se oficializa al instante y recibes tu dorsal.
            </Alert>
            <Box sx={{
              minWidth: '200px', minHeight: '44px', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover', borderRadius: 2, p: 1
            }}>
              {/* @ts-ignore */}
              <btn-yappy
                ref={yappyBtnRef}
                theme="dark"
                rounded="true"
                disabled={loading ? "true" : "false"}
              ></btn-yappy>
              {loading && <Typography variant="caption" sx={{ mt: 1, color: ACCENT }}>Generando pedido...</Typography>}
              <Typography variant="caption" sx={{ mt: 0.5, color: 'text.secondary', fontSize: '10px' }}>
                (Haz clic arriba para pagar con Yappy)
              </Typography>
            </Box>
          </Box>
        )}

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {info && <Alert severity="success" sx={{ mt: 2 }}>{info}</Alert>}

        <Button variant="outlined" onClick={() => window.location.href = '/mis-inscripciones'} sx={{ mt: 3, color: 'text.secondary', borderColor: 'divider' }}>
          Volver a Mis Inscripciones
        </Button>
      </Paper>

      <Snackbar open={!!error} autoHideDuration={5000} onClose={() => setError('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert>
      </Snackbar>
    </ThemeProvider>
  );
}