'use client';

import { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Card, CardContent, 
  Grid, Container, Chip, CircularProgress, Alert,
  TextField, List, ListItem, ListItemText,
  Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Select, MenuItem, FormControl, InputLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, Checkbox, FormControlLabel, IconButton, InputAdornment, useMediaQuery, useTheme
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import TimerIcon from '@mui/icons-material/Timer';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const ACCENT = '#FF6B00';
const R2_BASE = 'https://pub-ddaf4243012a44c5a61699bc0719121f.r2.dev';

const ensureAbsolute = (url: string) => {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  
  // Si ya es de R2 corregido, no tocar
  if (url.includes('pub-ddaf4243012a44c5a61699bc0719121f.r2.dev')) return url;

  // Extraer el path de /uploads/ si existe en la URL (para URLs de la API o R2 viejo)
  if (url.includes('/uploads/')) {
    const parts = url.split('/uploads/');
    return `${R2_BASE}/uploads/${parts[parts.length - 1]}`;
  }

  // Si es ruta relativa pura
  if (url.startsWith('/')) return `${R2_BASE}${url}`;
  
  // Si no tiene protocolo, asumir que es path relativo
  if (!url.startsWith('http')) return `${R2_BASE}/${url}`;

  return url;
};

interface Race {
  id: string;
  title: string;
  data?: {
    title?: string;
    status?: string;
    timerStart?: number;
    timerStop?: number;
  };
}

export default function AdminDashboard({ initialRaces = [] }: { initialRaces: Race[] }) {
  const [races, setRaces] = useState<Race[]>(initialRaces);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Estados para Tabs y Códigos
  const [tabIndex, setTabIndex] = useState(0);
  
  const TABS = [
    { label: 'Cronometraje en Vivo', value: 0 },
    { label: 'Gestión de Códigos', value: 1 },
    { label: 'Configurar Modalidades', value: 2 },
    { label: 'Configurar Categorías', value: 3 },
    { label: 'Lista de Inscritos', value: 4 },
  ];
  const [vendorInput, setVendorInput] = useState('');
  const [codeRaceId, setCodeRaceId] = useState('');
  const [codeQuantity, setCodeQuantity] = useState<number | ''>('');
  const [codeStats, setCodeStats] = useState<any[]>([]);
  const [allCodes, setAllCodes] = useState<any[]>([]);
  const [codesLoading, setCodesLoading] = useState(false);

  const fetchCodeStats = async () => {
    try {
      setCodesLoading(true);
      const res = await fetch('/api/admin/codes-stats');
      const data = await res.json();
      if (data.success) {
         setCodeStats(data.stats);
         setAllCodes(data.codes || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCodesLoading(false);
    }
  };

  useEffect(() => {
    if (tabIndex === 1) fetchCodeStats();
  }, [tabIndex]);

  const generateCodes = async () => {
    if (!vendorInput || !codeRaceId || !codeQuantity) {
      alert("Por favor llena todos los campos de vendedor, carrera y cantidad");
      return;
    }
    try {
      setCodesLoading(true);
      const res = await fetch('/api/admin/bulk-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor: vendorInput, raceId: codeRaceId, quantity: Number(codeQuantity) })
      });
      const data = await res.json();
      if (data.success) {
        setVendorInput('');
        setCodeQuantity('');
        fetchCodeStats();
        alert(`Se han generado ${data.codesGenerated} códigos para el lote ${data.batchId}`);
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert("Error al intentar generar los códigos");
    } finally {
      setCodesLoading(false);
    }
  };

  const [openBatchModal, setOpenBatchModal] = useState<string | null>(null);
  const [selectedForSale, setSelectedForSale] = useState<Record<string, boolean>>({});

  const handleOpenBatchModal = (batchId: string) => {
    setOpenBatchModal(batchId);
    setSelectedForSale({});
  };

  const handleToggleCode = (codeId: string) => {
    setSelectedForSale(prev => ({ ...prev, [codeId]: !prev[codeId] }));
  };

  const submitSpecificSales = async () => {
    const codeIdsToMark = Object.keys(selectedForSale).filter(id => selectedForSale[id]);
    if (codeIdsToMark.length === 0) return alert("Selecciona al menos un código generado para marcarlo.");

    try {
      setCodesLoading(true);
      const res = await fetch('/api/admin/mark-sold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeIds: codeIdsToMark })
      });
      const data = await res.json();
      if (data.success) {
        fetchCodeStats();
        setOpenBatchModal(null);
        alert(`Se han marcado ${data.marked} códigos exitosamente.`);
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert("Error marcando vendidos.");
    } finally {
      setCodesLoading(false);
    }
  };

  const exportCSV = (batchId: string) => {
    const batchCodes = allCodes.filter((c: any) => c.batchId === batchId);
    if (batchCodes.length === 0) return alert("No hay detalles de códigos cargados para este lote.");
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID Lote,Vendedor,Titulo Boleto,Codigo Físico,Web Status\r\n";
    
    batchCodes.forEach((c: any) => {
        csvContent += `${c.batchId},${c.vendor},${c.title},${c.code},${c.status}\r\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `CodigosFisicos_${batchId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printLibreta = async (batchId: string) => {
    const batchCodes = allCodes.filter((c: any) => c.batchId === batchId);
    if (batchCodes.length === 0) return alert("No hay códigos para esta libreta");

    const raceId = batchCodes[0].raceId;
    if (!raceId && !codeRaceId) return alert("Estos códigos antiguos no tienen una carrera asociada.");
    
    setCodesLoading(true);
    let raceResponse: any = {};
    try {
        const res = await fetch(`/api/race-info?raceId=${raceId || codeRaceId}`);
        raceResponse = await res.json();
    } catch(e) {
        setCodesLoading(false);
        return alert("Error obteniendo datos de la carrera para armar el PDF.");
    }
    
    const raceTitle = raceResponse.race?.data?.title || raceResponse.race?.title || 'Carrera STRYD';
    const raceLogo = raceResponse.race?.data?.imageUrl || '';
    const distances = raceResponse.distances || [];

    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const printContainer = document.createElement('div');
      printContainer.style.position = 'absolute';
      printContainer.style.top = '-9999px';
      printContainer.style.left = '-9999px';
      printContainer.style.width = '800px';
      printContainer.style.backgroundColor = 'white';
      printContainer.style.fontFamily = 'Arial, sans-serif';
      document.body.appendChild(printContainer);

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
      const pageWidth = 215.9; // Carta en mm
      const pageHeight = 279.4;
      const margin = 12;
      
      let currentY = margin;
      let ticketsOnPage = 0;

      for (let i = 0; i < batchCodes.length; i++) {
         const codeObj = batchCodes[i];
         
         const ticketDiv = document.createElement('div');
         ticketDiv.style.width = '800px';
         ticketDiv.style.height = '180px'; 
         ticketDiv.style.border = '2px dashed #999';
         ticketDiv.style.boxSizing = 'border-box';
         ticketDiv.style.padding = '15px';
         ticketDiv.style.display = 'flex';
         ticketDiv.style.justifyContent = 'space-between';
         ticketDiv.style.alignItems = 'center';
         ticketDiv.style.color = '#000';
         ticketDiv.style.backgroundColor = '#fff';

         const leftBox = document.createElement('div');
         leftBox.style.width = '20%';
         leftBox.style.textAlign = 'center';
         if (raceLogo) {
             const imgPath = raceLogo.startsWith('http') ? raceLogo : `https://api.carreras.strydpanama.com${raceLogo}`;
             leftBox.innerHTML = `<img src="${imgPath}" crossOrigin="anonymous" style="max-width:100%; max-height:130px; object-fit:contain;" />`;
         } else {
             leftBox.innerHTML = `<h2 style="color:${ACCENT}; margin:0; line-height:1.2; font-size:20px;">${raceTitle}</h2>`;
         }

         const centerBox = document.createElement('div');
         centerBox.style.width = '55%';
         centerBox.style.padding = '0 15px';
         centerBox.innerHTML = `
            <h3 style="margin:0 0 10px 0; font-size:22px; text-transform:uppercase;">${raceTitle}</h3>
            <div style="display:flex; flex-direction:column; gap:12px; font-size:16px;">
                <div style="display:flex; align-items:flex-end;">
                  <span style="font-weight:bold; width:80px;">Nombre:</span> 
                  <div style="border-bottom:1px solid #000; flex:1; height:20px;"></div>
                </div>
                <div style="display:flex; align-items:flex-end;">
                  <span style="font-weight:bold; width:80px;">Cédula:</span> 
                  <div style="border-bottom:1px solid #000; flex:1; height:20px; margin-right: 15px;"></div>
                  <span style="font-weight:bold; width:80px;">Telf:</span> 
                  <div style="border-bottom:1px solid #000; flex:1; height:20px;"></div>
                </div>
            </div>
            <div style="margin-top:20px; font-size:15px; display:flex; gap:15px; align-items:center;">
               <strong>Modalidad:</strong>
               ${distances.length > 0 
                  ? distances.map((d: any) => `<div style="display:flex; align-items:center; gap:5px;"><div style="width:14px; height:14px; border:1px solid #000; border-radius:3px;"></div><span>${d.name}</span></div>`).join('') 
                  : '<div style="border-bottom:1px solid #000; width:150px; height:20px;"></div>'}
            </div>
         `;

         const rightBox = document.createElement('div');
         rightBox.style.width = '25%';
         rightBox.style.textAlign = 'right';
         rightBox.innerHTML = `
            <div style="background-color:${ACCENT}; padding:15px; border-radius:8px; display:flex; flex-direction:column; align-items:center; justify-content:center; margin-bottom:10px;">
               <div style="font-size:12px; margin-bottom:5px; font-weight:bold; color:white; font-family:Arial, sans-serif;">REGISTRO WEB</div>
               <div style="font-size:26px; font-weight:900; color:white; font-family:monospace;">${codeObj.code}</div>
            </div>
            <div style="font-size:13px; color:#333; font-weight:bold; text-align:center; font-family:Arial, sans-serif;">carreras.strydpanama.com</div>
         `;

         ticketDiv.appendChild(leftBox);
         ticketDiv.appendChild(centerBox);
         ticketDiv.appendChild(rightBox);
         printContainer.appendChild(ticketDiv);

         const canvas = await html2canvas(ticketDiv, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
         const imgData = canvas.toDataURL('image/jpeg', 0.95);
         
         const ticketWidthMm = pageWidth - (margin * 2);
         const imgProps = doc.getImageProperties(imgData);
         const printHeight = (imgProps.height * ticketWidthMm) / imgProps.width;

         if (currentY + printHeight > pageHeight - margin) {
             doc.addPage();
             currentY = margin;
             ticketsOnPage = 0;
         }

         doc.addImage(imgData, 'JPEG', margin, currentY, ticketWidthMm, printHeight);
         currentY += printHeight + 3; // 3mm spacing entre tickets para que quepan 5 o 6
         ticketsOnPage++;
         
         printContainer.removeChild(ticketDiv);
      }
      
      document.body.removeChild(printContainer);
      doc.save(`Libreta_Carrera_${batchId}.pdf`);

    } catch(err) {
        console.error(err);
        alert("Ocurrió un error dibujando la libreta PDF.");
    }

    setCodesLoading(false);
  };
  
  // --- Estados para Configurar Modalidades (Tab 3) ---
  const [modalRaceId, setModalRaceId] = useState('');
  const [allDistances, setAllDistances] = useState<any[]>([]);
  const [distanceSaving, setDistanceSaving] = useState(false);
  const [distanceMsg, setDistanceMsg] = useState<{ text: string; ok: boolean } | null>(null);
  // Mapa local: distanceId -> checked
  const [distanceChecks, setDistanceChecks] = useState<Record<string, boolean>>({});

  const loadAllDistances = async () => {
    try {
      const res = await fetch('/api/admin/all-distances');
      const data = await res.json();
      if (data.success) setAllDistances(data.distances);
    } catch(e) { console.error(e); }
  };

  // --- Gestión de Categorías (Tab 3) ---
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [categoryChecks, setCategoryChecks] = useState<Record<string, boolean>>({});
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryMsg, setCategoryMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [newCat, setNewCat] = useState({ title: '', minAge: '', maxAge: '', gender: 'ambos' });

  const loadAllCategories = async () => {
    try {
      const res = await fetch('/api/admin/all-categories');
      const data = await res.json();
      if (data.success) setAllCategories(data.categories);
    } catch(e) { console.error(e); }
  };

  const createCategory = async () => {
    if (!newCat.title || !newCat.minAge || !newCat.maxAge || !modalRaceId) {
      alert('Completa todos los campos y selecciona una carrera');
      return;
    }
    setCategorySaving(true);
    try {
      const res = await fetch('/api/admin/create-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newCat, raceId: modalRaceId })
      });
      const data = await res.json();
      if (data.success) {
        setNewCat({ title: '', minAge: '', maxAge: '', gender: 'ambos' });
        await loadAllCategories();
      } else { alert(data.error); }
    } catch(e) { alert('Error creando categoría'); }
    setCategorySaving(false);
  };

  const saveCategoryAssignments = async () => {
    if (!modalRaceId) return alert('Selecciona una carrera primero');
    setCategorySaving(true);
    setCategoryMsg(null);
    let ok = 0; let fail = 0;
    for (const cat of allCategories) {
      const shouldBelong = !!categoryChecks[cat.id];
      const currentlyBelongs = cat.race === modalRaceId;
      if (shouldBelong !== currentlyBelongs) {
        try {
          const res = await fetch('/api/admin/update-category', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categoryId: cat.id, raceId: shouldBelong ? modalRaceId : '', collectionId: cat.collectionId })
          });
          const data = await res.json();
          if (data.success) ok++; else fail++;
        } catch(e) { fail++; }
      }
    }
    await loadAllCategories();
    setCategorySaving(false);
    if (fail === 0) setCategoryMsg({ text: `✅ Categorías actualizadas (${ok} cambios).`, ok: true });
    else setCategoryMsg({ text: `⚠️ ${ok} actualizadas, ${fail} fallaron.`, ok: false });
  };

  useEffect(() => {
    if (tabIndex === 2) loadAllDistances();
    if (tabIndex === 3) loadAllCategories();
  }, [tabIndex]);

  useEffect(() => {
    if (!modalRaceId) { setCategoryChecks({}); return; }
    const checks: Record<string, boolean> = {};
    allCategories.forEach(c => { checks[c.id] = c.race === modalRaceId; });
    setCategoryChecks(checks);
  }, [modalRaceId, allCategories]);

  useEffect(() => {
    if (!modalRaceId) { setDistanceChecks({}); return; }
    // Pre-marcar las que ya están asignadas a esta carrera
    const checks: Record<string, boolean> = {};
    allDistances.forEach(d => {
      checks[d.id] = d.race === modalRaceId;
    });
    setDistanceChecks(checks);
  }, [modalRaceId, allDistances]);

  const saveDistanceAssignments = async () => {
    if (!modalRaceId) return alert('Selecciona una carrera primero');
    setDistanceSaving(true);
    setDistanceMsg(null);
    let ok = 0; let fail = 0;
    for (const dist of allDistances) {
      const shouldBelongToRace = !!distanceChecks[dist.id];
      const currentlyBelongsToRace = dist.race === modalRaceId;
      // Solo actualizar si cambió el estado
      if (shouldBelongToRace !== currentlyBelongsToRace) {
        try {
          const res = await fetch('/api/admin/update-distance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              distanceId: dist.id,
              collectionId: dist.collectionId,
              raceId: shouldBelongToRace ? modalRaceId : ''
            })
          });
          const data = await res.json();
          if (data.success) ok++; else fail++;
        } catch(e) { fail++; }
      }
    }
    // Refresh
    await loadAllDistances();
    setDistanceSaving(false);
    if (fail === 0) setDistanceMsg({ text: `✅ Modalidades actualizadas correctamente (${ok} cambios).`, ok: true });
    else setDistanceMsg({ text: `⚠️ ${ok} actualizadas, ${fail} fallaron. Intenta de nuevo.`, ok: false });
  };

  // --- Bulk Team Names ---
  const [bulkTeamInput, setBulkTeamInput] = useState('');
  const [bulkTeamMsg, setBulkTeamMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [bulkTeamLoading, setBulkTeamLoading] = useState(false);

  const bulkAddTeams = async () => {
    const names = bulkTeamInput.split(',').map(n => n.trim()).filter(Boolean);
    if (names.length === 0) return alert('Escribe al menos un nombre antes de importar.');
    setBulkTeamLoading(true);
    setBulkTeamMsg(null);

    const BATCH_SIZE = 20;
    let totalCreated = 0;
    let totalSkipped = 0;

    for (let i = 0; i < names.length; i += BATCH_SIZE) {
      const chunk = names.slice(i, i + BATCH_SIZE);
      setBulkTeamMsg({ text: `Procesando... ${Math.min(i + BATCH_SIZE, names.length)} / ${names.length}`, ok: true });
      try {
        const res = await fetch('/api/admin/bulk-teams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ names: chunk })
        });
        const data = await res.json();
        if (data.success) {
          totalCreated += data.created || 0;
          totalSkipped += data.skipped || 0;
        } else {
          totalSkipped += chunk.length;
        }
      } catch {
        totalSkipped += chunk.length;
      }
    }

    setBulkTeamInput('');
    setBulkTeamLoading(false);
    setBulkTeamMsg({ text: `${totalCreated} equipos importados exitosamente.${totalSkipped > 0 ? ` ${totalSkipped} omitidos (duplicados o errores).` : ''}`, ok: true });
  };

  // --- Gestión de Participantes (Tab 4) ---
  const [participants, setParticipants] = useState<any[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantSearch, setParticipantSearch] = useState('');
  const [participantRaceFilter, setParticipantRaceFilter] = useState('');

  const fetchParticipants = async (raceId: string) => {
    if (!raceId) {
       setParticipants([]);
       return;
    }
    
    try {
      setParticipantsLoading(true);
      const res = await fetch(`/api/admin/participants?raceId=${encodeURIComponent(raceId)}`);
      const data = await res.json();
      if (data.success) {
        setParticipants(data.participants);
      } else {
        console.error("Error API:", data.error);
        alert(`Error al buscar inscritos: ${data.error}`);
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión al cargar inscripciones.');
    } finally {
      setParticipantsLoading(false);
    }
  };

  useEffect(() => {
    if (tabIndex === 4) {
      if (allDistances.length === 0) loadAllDistances();
      fetchParticipants(participantRaceFilter);
    }
  }, [tabIndex, participantRaceFilter]);

  const [selectedParticipant, setSelectedParticipant] = useState<any>(null);

  const confirmPayment = async (participantId: string) => {
    if (!confirm('¿Estás seguro de marcar este pago como confirmado?')) return;
    
    try {
      setParticipantsLoading(true);
      const res = await fetch('/api/admin/update-participant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: participantId,
          updates: { paymentStatus: 'Confirmado' }
        })
      });
      const data = await res.json();
      if (data.success) {
        setParticipants(prev => prev.map(p => 
          p.id === participantId ? { ...p, paymentStatus: 'Confirmado' } : p
        ));
      } else {
        alert(data.error || 'Error al confirmar pago');
      }
    } catch (e) {
      alert('Error en la conexión');
    } finally {
      setParticipantsLoading(false);
    }
  };

  const exportParticipantsCSV = () => {
    const filtered = participants.filter(p => {
      const matchesSearch = (p.title + p.bibNumber + p.teamName).toLowerCase().includes(participantSearch.toLowerCase());
      const matchesRace = !participantRaceFilter || p.race === participantRaceFilter;
      return matchesSearch && matchesRace;
    });

    if (filtered.length === 0) return alert("No hay participantes para exportar");

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Dorsal,Nombre,Email,Cedula,Equipo,Carrera,Distancia,Pago\r\n";
    
    filtered.forEach(p => {
        csvContent += `${p.bibNumber},"${p.title}",${p.email},${p.cedula},"${p.teamName}",${p.race},${p.distance},${p.paymentStatus}\r\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Participantes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportParticipantsPDF = async () => {
    const filtered = participants.filter(p => {
      const matchesSearch = (p.title + p.bibNumber + p.teamName).toLowerCase().includes(participantSearch.toLowerCase());
      const matchesRace = !participantRaceFilter || p.race === participantRaceFilter;
      return matchesSearch && matchesRace;
    });

    if (filtered.length === 0) return alert("No hay participantes para exportar");

    const { jsPDF } = await import('jspdf');
    // Intentamos importar autotable dinámicamente si está disponible, sino lo hacemos manual
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Lista de Participantes - STRYD Panama', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 28);
    
    let y = 40;
    doc.setFontSize(12);
    doc.text('Dorsal', 14, y);
    doc.text('Nombre', 30, y);
    doc.text('Equipo', 90, y);
    doc.text('Estado', 150, y);
    
    y += 2;
    doc.line(14, y, 196, y);
    y += 7;
    
    doc.setFontSize(10);
    filtered.forEach((p, index) => {
        if (y > 280) {
            doc.addPage();
            y = 20;
        }
        doc.text(String(p.bibNumber || '-'), 14, y);
        doc.text(p.title || '-', 30, y);
        doc.text(p.teamName || '-', 90, y);
        doc.text(p.paymentStatus || '-', 150, y);
        y += 8;
    });
    
    doc.save(`Participantes_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Estados para Meta de Llegada
  const [bibInput, setBibInput] = useState<Record<string, string>>({});
  const [recentFinishes, setRecentFinishes] = useState<Record<string, any[]>>({});

  const registerFinish = async (raceId: string, timerStart: number) => {
    const bib = bibInput[raceId]?.trim();
    if (!bib) return;

    setLoading(raceId);
    setError(null);
    const finishTime = Math.floor(Date.now() / 1000) - timerStart;

    try {
      const res = await fetch('/api/admin/register-finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raceId, bibNumber: bib, finishTime })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrar llegada');
      
      // Limpiar input y agregar a la lista de recientes
      setBibInput(prev => ({ ...prev, [raceId]: '' }));
      setRecentFinishes(prev => {
        const raceFinishes = prev[raceId] || [];
        return {
          ...prev,
          [raceId]: [data.participant, ...raceFinishes].slice(0, 10) // Mantener últimos 10
        };
      });
      
      // Feedback visual opcional
      const beep = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU');
      beep.play().catch(() => {}); // Intentar sonido tipo scanner
      
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  };

  const updateRace = async (id: string, updates: any) => {
    setLoading(id);
    setError(null);
    try {
      const res = await fetch('/api/admin/update-race', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates })
      });
      
      if (!res.ok) throw new Error('Error al actualizar la carrera');
      
      // Actualizamos el estado local
      setRaces(prev => prev.map(r => 
        r.id === id ? { ...r, data: { ...r.data, ...updates } } : r
      ));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  };

  const startTimer = (id: string) => {
    updateRace(id, { 
      timerStart: Math.floor(Date.now() / 1000), 
      timerStop: null,
      status: 'active' 
    });
  };

  const stopTimer = (id: string) => {
    updateRace(id, { 
      timerStop: Math.floor(Date.now() / 1000)
    });
  };

  const resetTimer = (id: string) => {
    if (confirm('¿Estás seguro de reiniciar el cronómetro?')) {
      updateRace(id, { 
        timerStart: null, 
        timerStop: null
      });
    }
  };

  const [now, setNow] = useState(Math.floor(Date.now() / 1000));

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h3" sx={{ fontWeight: 900, mb: 1 }}>
          PANEL DE <Box component="span" sx={{ color: ACCENT }}>CONTROL</Box>
        </Typography>
        <Typography color="text.secondary">Gestión de carreras y códigos físicos</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        {isMobile ? (
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Navegación del Panel</InputLabel>
            <Select
              value={tabIndex}
              label="Navegación del Panel"
              onChange={(e) => setTabIndex(Number(e.target.value))}
              startAdornment={<MenuIcon sx={{ mr: 1, color: ACCENT }} />}
              sx={{
                bgcolor: '#1a1a1a',
                color: 'white',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: ACCENT },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#E55A00' },
              }}
            >
              {TABS.map((t) => (
                <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : (
          <Tabs 
            value={tabIndex} 
            onChange={(e, v) => setTabIndex(v)} 
            centered 
            textColor="inherit"
            TabIndicatorProps={{ style: { backgroundColor: ACCENT } }}
            sx={{
              mb: 2,
              '& .MuiTab-root': { 
                  fontWeight: 'bold',
                  fontSize: { xs: '0.8rem', md: '1rem' },
                  opacity: 0.6,
                  transition: 'opacity 0.2s'
              },
              '& .Mui-selected': { 
                  color: `${ACCENT} !important`,
                  opacity: 1
              }
            }}
          >
            {TABS.map((t) => (
              <Tab key={t.value} label={t.label} />
            ))}
          </Tabs>
        )}
      </Box>

      {tabIndex === 0 && (
      <Grid container spacing={3}>
        {races.map((race) => (
          <Grid key={race.id} size={{ xs: 12, md: 6 }}>
            <Card sx={{ 
              borderRadius: 4, 
              bgcolor: 'background.paper',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              border: '1px solid',
              borderColor: race.data?.status === 'active' ? ACCENT : 'divider'
            }}>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                      {race.data?.title || race.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">ID: {race.id}</Typography>
                  </Box>
                  <Chip 
                    label={race.data?.status?.toUpperCase() || 'INACTIVE'} 
                    color={race.data?.status === 'active' ? 'success' : 'default'}
                    sx={{ fontWeight: 'bold' }}
                  />
                </Box>

                <Box sx={{ 
                  bgcolor: '#000', 
                  borderRadius: 3, 
                  p: 3, 
                  mb: 4, 
                  textAlign: 'center',
                  border: '1px solid #333'
                }}>
                  <Typography variant="h4" sx={{ color: ACCENT, fontFamily: 'monospace', fontWeight: 'bold' }}>
                    {race.data?.timerStart 
                      ? formatTime((race.data.timerStop || now) - race.data.timerStart) 
                      : '00:00'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'grey.500' }}>
                    {race.data?.timerStart 
                      ? (race.data.timerStop ? 'Carrera finalizada' : `En curso (Inicio: ${new Date(race.data.timerStart * 1000).toLocaleTimeString()})`) 
                      : 'Listo para iniciar'}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  {!race.data?.timerStart ? (
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={loading === race.id ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
                      onClick={() => startTimer(race.id)}
                      disabled={!!loading}
                      sx={{ bgcolor: ACCENT, py: 1.5, '&:hover': { bgcolor: '#E55A00' } }}
                    >
                      INICIAR
                    </Button>
                  ) : (
                    <>
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={loading === race.id ? <CircularProgress size={20} color="inherit" /> : <StopIcon />}
                        onClick={() => stopTimer(race.id)}
                        disabled={!!loading || !!race.data?.timerStop}
                        sx={{ color: '#ff4444', borderColor: '#ff4444', '&:hover': { borderColor: '#cc0000', bgcolor: 'rgba(255,0,0,0.05)' } }}
                      >
                        DETENER
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => resetTimer(race.id)}
                        disabled={!!loading}
                        sx={{ minWidth: 56 }}
                      >
                        <RestartAltIcon />
                      </Button>
                    </>
                  )}
                </Box>

                {/* --- SECCIÓN META DE LLEGADA --- */}
                {race.data?.timerStart && !race.data?.timerStop && (
                  <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                      🏁 Meta de Llegadas
                    </Typography>
                    <Box component="form" onSubmit={(e) => {
                      e.preventDefault();
                      if (bibInput[race.id]?.trim()) {
                        registerFinish(race.id, race.data!.timerStart!);
                      }
                    }} sx={{ display: 'flex', gap: 1 }}>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="Escanear o teclear Dorsal"
                        value={bibInput[race.id] || ''}
                        onChange={(e) => setBibInput(prev => ({ ...prev, [race.id]: e.target.value }))}
                        disabled={!!loading}
                        autoComplete="off"
                        InputProps={{
                          sx: { fontWeight: 'bold', fontSize: '1.2rem' }
                        }}
                      />
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={!!loading || !bibInput[race.id]}
                        sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#E55A00' } }}
                      >
                        Registrar
                      </Button>
                    </Box>
                    
                    {/* Lista de Llegadas Recientes */}
                    {recentFinishes[race.id]?.length > 0 && (
                      <Box sx={{ mt: 3, bgcolor: 'background.default', borderRadius: 2, p: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                          ÚLTIMOS REGISTROS
                        </Typography>
                        <List dense disablePadding>
                          {recentFinishes[race.id].map((finish: any, i: number) => (
                            <ListItem key={i} disablePadding sx={{ py: 0.5, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                              <ListItemText 
                                primary={
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                      #{finish.bibNumber} - {finish.name}
                                    </Typography>
                                    <Typography variant="body2" color="success.main" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                                      {formatTime(finish.finishTime)}
                                    </Typography>
                                  </Box>
                                }
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      )}

      {tabIndex === 1 && (
        <Box>
          <Card sx={{ mb: 4, p: 2, borderRadius: 4 }}>
            <CardContent>
              <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>Generar Nuevo Lote</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 200, flex: 1 }}>
                  <InputLabel>Carrera Destino</InputLabel>
                  <Select value={codeRaceId} label="Carrera Destino" onChange={(e) => setCodeRaceId(e.target.value)}>
                    {races.map(r => <MenuItem key={r.id} value={r.id}>{r.data?.title || r.title || 'Carrera'}</MenuItem>)}
                  </Select>
                </FormControl>
                
                <TextField size="small" sx={{ minWidth: 250, flex: 1 }} label="Vendedor Físico (Punto de Venta)" placeholder="Ej. Tienda Running" value={vendorInput} onChange={e => setVendorInput(e.target.value)} />
                
                <TextField type="number" size="small" sx={{ width: 120 }} label="Cantidad" placeholder="Ej. 20" value={codeQuantity} onChange={e => setCodeQuantity(e.target.value ? Number(e.target.value) : '')} />
                
                <Button variant="contained" onClick={generateCodes} disabled={codesLoading} sx={{ py: 1, px: 3, bgcolor: ACCENT, '&:hover': { bgcolor: '#E55A00' } }}>
                  {codesLoading ? 'PROCESANDO...' : 'GENERAR CÓDIGOS'}
                </Button>
              </Box>
            </CardContent>
          </Card>
          
          <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>Seguimiento por Vendedor y Lote</Typography>
          <TableContainer component={Paper} sx={{ borderRadius: 4, bgcolor: 'background.paper' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell><strong>Vendedor</strong></TableCell>
                  <TableCell><strong>ID de Lote</strong></TableCell>
                  <TableCell align="center"><strong>Total Impresos</strong></TableCell>
                  <TableCell align="center"><strong>Faltan x Vender</strong></TableCell>
                  <TableCell align="center"><strong>Faltan x Canjear</strong></TableCell>
                  <TableCell align="center"><strong>Canjes Exitosos</strong></TableCell>
                  <TableCell align="center"><strong>Acciones</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {codeStats.length === 0 ? <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}>No hay códigos registrados</TableCell></TableRow> : codeStats.map((stat, i) => (
                  <TableRow key={i}>
                    <TableCell sx={{ fontWeight: 'bold' }}>{stat.vendor}</TableCell>
                    <TableCell><Chip label={stat.batchId} size="small" /></TableCell>
                    <TableCell align="center">{stat.total}</TableCell>
                    <TableCell align="center"><Typography color="success.main" fontWeight="bold">{stat.generated}</Typography></TableCell>
                    <TableCell align="center">{stat.sold}</TableCell>
                    <TableCell align="center"><Typography color="info.main">{stat.redeemed}</Typography></TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'center' }}>
                         <Button size="small" variant="outlined" onClick={() => handleOpenBatchModal(stat.batchId)} disabled={stat.generated === 0 || codesLoading}>
                           Administrar Lote
                         </Button>
                         <Button size="small" variant="contained" sx={{ bgcolor: ACCENT, color: 'white', '&:hover': { bgcolor: '#E55A00' } }} onClick={() => printLibreta(stat.batchId)} disabled={codesLoading}>
                           Crear Libreta PDF
                         </Button>
                         <Button size="small" variant="contained" sx={{ bgcolor: '#333', color: 'white', '&:hover': { bgcolor: '#000' } }} onClick={() => exportCSV(stat.batchId)} disabled={codesLoading}>
                           Exportar CSV
                         </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Dialog open={!!openBatchModal} onClose={() => setOpenBatchModal(null)} maxWidth="md" fullWidth>
            <DialogTitle sx={{ fontWeight: 'bold' }}>
               Administrar Códigos del Lote <Chip label={openBatchModal} size="small" sx={{ ml: 1, fontWeight: 'bold' }} />
            </DialogTitle>
            <DialogContent dividers sx={{ p: 0 }}>
                <Box sx={{ p: 2, bgcolor: 'action.hover' }}>
                    <Typography variant="body2" color="text.secondary">
                      Selecciona con la casilla de verificación los códigos específicos que el vendedor reportó como vendidos el día de hoy.
                    </Typography>
                </Box>
                <Table size="small">
                   <TableHead>
                     <TableRow>
                       <TableCell>Selección</TableCell>
                       <TableCell>Código Exacto</TableCell>
                       <TableCell>Estado de Vida</TableCell>
                     </TableRow>
                   </TableHead>
                   <TableBody>
                     {allCodes.filter(c => c.batchId === openBatchModal).map(code => (
                       <TableRow key={code.id} sx={{ opacity: code.status === 'generated' ? 1 : 0.6 }}>
                         <TableCell padding="checkbox">
                           <Checkbox 
                              checked={!!selectedForSale[code.id]} 
                              onChange={() => handleToggleCode(code.id)}
                              disabled={code.status !== 'generated'}
                           />
                         </TableCell>
                         <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '1.1rem' }}>{code.code}</TableCell>
                         <TableCell>
                            {code.status === 'generated' && <Chip size="small" label="Falta x Vender" color="success" />}
                            {code.status === 'sold' && <Chip size="small" label="Vendido (Falta x Canjear)" color="warning" />}
                            {code.status === 'redeemed' && <Chip size="small" label="Canjeado Exitoso" color="info" />}
                         </TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                </Table>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
               <Button onClick={() => setOpenBatchModal(null)} color="inherit" sx={{ fontWeight: 'bold' }}>Cancelar</Button>
               <Button onClick={submitSpecificSales} variant="contained" disabled={codesLoading} sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#E55A00' }, fontWeight: 'bold', px: 3 }}>
                 {codesLoading ? 'Guardando...' : 'Marcar Seleccionados como Vendidos'}
               </Button>
            </DialogActions>
          </Dialog>

        </Box>
      )}
      {tabIndex === 2 && (
        <Box>
          <Typography variant="h5" sx={{ mb: 1, fontWeight: 'bold' }}>Configurar Modalidades por Carrera</Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>Selecciona una carrera y elige cuáles distancias del sistema estarán disponibles para ella.</Typography>
          
          <Card sx={{ p: 3, mb: 4, borderRadius: 4 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>1. Selecciona la Carrera</Typography>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Carrera</InputLabel>
                <Select value={modalRaceId} label="Carrera" onChange={e => setModalRaceId(e.target.value)}>
                  {races.map(r => (
                    <MenuItem key={r.id} value={r.id}>{r.data?.title || r.title}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {modalRaceId && (
                <>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>2. Tilda las Modalidades Disponibles</Typography>
                  {allDistances.length === 0 ? (
                    <Alert severity="info">No hay distancias creadas en el sistema. Créalas primero en el panel de SonicJS (Content → Distancias).</Alert>
                  ) : (
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 1, mb: 3 }}>
                      {allDistances.map(dist => (
                        <Paper key={dist.id} variant="outlined" sx={{
                          p: 2,
                          borderRadius: 3,
                          borderColor: distanceChecks[dist.id] ? ACCENT : 'divider',
                          borderWidth: distanceChecks[dist.id] ? 2 : 1,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          bgcolor: distanceChecks[dist.id] ? `${ACCENT}15` : 'background.paper'
                        }}
                          onClick={() => setDistanceChecks(prev => ({ ...prev, [dist.id]: !prev[dist.id] }))}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Checkbox
                              checked={!!distanceChecks[dist.id]}
                              onChange={() => setDistanceChecks(prev => ({ ...prev, [dist.id]: !prev[dist.id] }))}
                              sx={{ '&.Mui-checked': { color: ACCENT }, p: 0 }}
                            />
                            <Box>
                              <Typography fontWeight="bold">{dist.title}</Typography>
                              {dist.kilometers && <Typography variant="caption" color="text.secondary">{dist.kilometers} km</Typography>}
                              {dist.race && dist.race !== modalRaceId && (
                                <Typography variant="caption" sx={{ display: 'block', color: 'warning.main' }}>⚠️ Asignada a otra carrera</Typography>
                              )}
                            </Box>
                          </Box>
                        </Paper>
                      ))}
                    </Box>
                  )}

                  {distanceMsg && (
                    <Alert severity={distanceMsg.ok ? 'success' : 'warning'} sx={{ mb: 2 }}>{distanceMsg.text}</Alert>
                  )}

                  <Button
                    variant="contained"
                    onClick={saveDistanceAssignments}
                    disabled={distanceSaving}
                    sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#E55A00' }, fontWeight: 'bold', px: 4, py: 1.5 }}
                  >
                    {distanceSaving ? 'Guardando...' : 'GUARDAR CONFIGURACIÓN'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Importador masivo de equipos */}
          <Card sx={{ p: 3, mb: 4, borderRadius: 4 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>Importar Equipos en Masa</Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>Escribe o pega los nombres de equipos separados por coma. Cada nombre se creará automáticamente en la base de datos y aparecerá en el formulario de inscripción individual.</Typography>
              
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Nombres de Equipos (separados por coma)"
                value={bulkTeamInput}
                onChange={e => setBulkTeamInput(e.target.value)}
                placeholder="Ej: Correcaminos FC, Los Velocistas, Equipo A, Tigres del Sur, ..."
                sx={{ mb: 2 }}
              />

              {/* Preview */}
              {bulkTeamInput.trim() && (
                <Box sx={{ mb: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary">Vista previa ({bulkTeamInput.split(',').filter(n => n.trim()).length} equipos):</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                    {bulkTeamInput.split(',').filter(n => n.trim()).map((n, i) => (
                      <Chip key={i} label={n.trim()} size="small" />
                    ))}
                  </Box>
                </Box>
              )}

              {bulkTeamMsg && (
                <Alert severity={bulkTeamMsg.ok ? 'success' : 'error'} sx={{ mb: 2 }}>{bulkTeamMsg.text}</Alert>
              )}

              <Button
                variant="contained"
                onClick={bulkAddTeams}
                disabled={bulkTeamLoading || !bulkTeamInput.trim()}
                sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#E55A00' }, fontWeight: 'bold', px: 4, py: 1.5 }}
              >
                {bulkTeamLoading ? 'Importando...' : 'IMPORTAR EQUIPOS'}
              </Button>
            </CardContent>
          </Card>
        </Box>
      )}

      {tabIndex === 3 && (
        <Box>
          <Card sx={{ p: 1, mb: 4, borderRadius: 4 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>Categorías por Carrera</Typography>
              
              <FormControl fullWidth sx={{ mb: 4 }}>
                <InputLabel>Selecciona la Carrera</InputLabel>
                <Select value={modalRaceId} label="Selecciona la Carrera" onChange={e => setModalRaceId(e.target.value)}>
                  {races.map(r => <MenuItem key={r.id} value={r.id}>{r.data?.title || r.title}</MenuItem>)}
                </Select>
              </FormControl>

              {modalRaceId && (
                <>
                  <Box sx={{ p: 3, mb: 4, bgcolor: 'rgba(255, 107, 0, 0.05)', borderRadius: 3, border: '1px dashed #FF6B00' }}>
                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>+ Crear Nueva Categoría Rápida</Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <TextField fullWidth size="small" label="Nombre (ej: Máster A)" value={newCat.title} onChange={e => setNewCat({...newCat, title: e.target.value})} />
                      </Grid>
                      <Grid size={{ xs: 6, md: 2 }}>
                        <TextField fullWidth size="small" type="number" label="Edad Min" value={newCat.minAge} onChange={e => setNewCat({...newCat, minAge: e.target.value})} />
                      </Grid>
                      <Grid size={{ xs: 6, md: 2 }}>
                        <TextField fullWidth size="small" type="number" label="Edad Max" value={newCat.maxAge} onChange={e => setNewCat({...newCat, maxAge: e.target.value})} />
                      </Grid>
                      <Grid size={{ xs: 8, md: 2 }}>
                        <Select fullWidth size="small" value={newCat.gender} onChange={e => setNewCat({...newCat, gender: e.target.value})}>
                          <MenuItem value="masculino">Masculino</MenuItem>
                          <MenuItem value="femenino">Femenino</MenuItem>
                          <MenuItem value="ambos">Ambos</MenuItem>
                        </Select>
                      </Grid>
                      <Grid size={{ xs: 4, md: 2 }}>
                        <Button fullWidth variant="contained" onClick={createCategory} sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#E55A00' } }}>CREAR</Button>
                      </Grid>
                    </Grid>
                  </Box>

                  <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>Asignar Categorías Existentes:</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2, mb: 4 }}>
                    {allCategories.map(cat => (
                      <Paper key={cat.id} sx={{ p: 2, borderRadius: 2, cursor: 'pointer', border: '1px solid', borderColor: categoryChecks[cat.id] ? ACCENT : 'divider' }} onClick={() => setCategoryChecks(prev => ({...prev, [cat.id]: !prev[cat.id]}))}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Checkbox checked={!!categoryChecks[cat.id]} sx={{ p: 0, '&.Mui-checked': { color: ACCENT } }} />
                          <Box>
                            <Typography fontWeight="bold" variant="body2">{cat.title}</Typography>
                            <Typography variant="caption" color="text.secondary">{cat.minAge}-{cat.maxAge} años • {cat.gender}</Typography>
                          </Box>
                        </Box>
                      </Paper>
                    ))}
                  </Box>

                  {categoryMsg && <Alert severity={categoryMsg.ok ? 'success' : 'warning'} sx={{ mb: 2 }}>{categoryMsg.text}</Alert>}

                  <Button variant="contained" onClick={saveCategoryAssignments} disabled={categorySaving} sx={{ bgcolor: ACCENT, px: 4, fontWeight: 'bold' }}>
                    {categorySaving ? 'Guardando...' : 'GUARDAR CONFIGURACIÓN'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {tabIndex === 4 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, flex: 1, minWidth: 300 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Buscar por nombre, dorsal o equipo..."
                value={participantSearch}
                onChange={e => setParticipantSearch(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                    '&.Mui-focused fieldset': { borderColor: ACCENT },
                  },
                  '& .MuiInputBase-input::placeholder': { color: 'rgba(255, 255, 255, 0.5)', opacity: 1 },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                    </InputAdornment>
                  ),
                }}
              />
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)', '&.Mui-focused': { color: ACCENT } }}>
                  Filtrar por Carrera
                </InputLabel>
                <Select
                  value={participantRaceFilter}
                  label="Filtrar por Carrera"
                  onChange={e => setParticipantRaceFilter(e.target.value)}
                  sx={{
                    color: 'white',
                    '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: ACCENT },
                    '.MuiSvgIcon-root': { color: 'white' },
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        bgcolor: '#1a1a1a',
                        color: 'white',
                        '& .MuiMenuItem-root:hover': { bgcolor: 'rgba(255, 107, 0, 0.1)' },
                      }
                    }
                  }}
                >
                  <MenuItem value="">Todas las carreras</MenuItem>
                  {races.map(r => (
                    <MenuItem key={r.id} value={r.id}>{r.data?.title || r.title}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                variant="outlined" 
                startIcon={<DownloadIcon />} 
                onClick={exportParticipantsCSV}
                sx={{ borderColor: '#333', color: '#333', '&:hover': { bgcolor: 'rgba(0,0,0,0.05)', borderColor: '#000' } }}
              >
                CSV
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<PictureAsPdfIcon />} 
                onClick={exportParticipantsPDF}
                sx={{ borderColor: '#ff4444', color: '#ff4444', '&:hover': { bgcolor: 'rgba(255,0,0,0.05)', borderColor: '#cc0000' } }}
              >
                PDF
              </Button>
              <IconButton onClick={() => fetchParticipants(participantRaceFilter)} disabled={participantsLoading || !participantRaceFilter} color="inherit">
                {participantsLoading ? <CircularProgress size={24} color="inherit" /> : <RestartAltIcon />}
              </IconButton>
            </Box>
          </Box>

          <TableContainer component={Paper} sx={{ borderRadius: 4, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow sx={{ bgcolor: 'black' }}>
                  <TableCell sx={{ bgcolor: 'black', color: 'white', fontWeight: 'bold' }}>Acción</TableCell>
                  <TableCell sx={{ bgcolor: 'black', color: 'white', fontWeight: 'bold' }}>Dorsal</TableCell>
                  <TableCell sx={{ bgcolor: 'black', color: 'white', fontWeight: 'bold' }}>Participante</TableCell>
                  <TableCell sx={{ bgcolor: 'black', color: 'white', fontWeight: 'bold' }}>Equipo</TableCell>
                  <TableCell sx={{ bgcolor: 'black', color: 'white', fontWeight: 'bold' }}>Carrera / Distancia</TableCell>
                  <TableCell sx={{ bgcolor: 'black', color: 'white', fontWeight: 'bold' }}>Pago</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!participantRaceFilter ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                      <Alert severity="info" sx={{ display: 'inline-flex', justifyContent: 'center' }}>
                        Por favor selecciona una carrera en el filtro de arriba para ver la lista de sus inscritos.
                      </Alert>
                    </TableCell>
                  </TableRow>
                ) : participantsLoading ? (
                  <TableRow>
                     <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                       <CircularProgress sx={{ color: ACCENT }} />
                     </TableCell>
                  </TableRow>
                ) : participants.filter(p => {
                  const matchesSearch = (p.title + p.bibNumber + (p.teamName || '')).toLowerCase().includes(participantSearch.toLowerCase());
                  return matchesSearch;
                }).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                      No se encontraron participantes para esta carrera
                    </TableCell>
                  </TableRow>
                ) : (
                  participants
                    .filter(p => {
                      const matchesSearch = (p.title + p.bibNumber + (p.teamName || '')).toLowerCase().includes(participantSearch.toLowerCase());
                      return matchesSearch;
                    })
                    .sort((a,b) => (Number(a.bibNumber) || 0) - (Number(b.bibNumber) || 0))
                    .map((p) => {
                      const race = races.find(r => r.id === p.race);
                      const isConfirmed = p.paymentStatus === 'Confirmado';
                      
                      return (
                        <TableRow key={p.id} hover sx={{ cursor: 'pointer', '&:last-child td, &:last-child th': { border: 0 } }} onClick={(e) => {
                            if ((e.target as HTMLElement).closest('button')) return; // Avoid opening if clicking confirm button
                            setSelectedParticipant(p);
                        }}>
                          <TableCell sx={{ minWidth: 150 }}>
                            {!isConfirmed ? (
                              <Button
                                variant="contained"
                                size="small"
                                onClick={() => confirmPayment(p.id)}
                                sx={{ 
                                  bgcolor: ACCENT, 
                                  '&:hover': { bgcolor: '#E55A00' },
                                  fontSize: '0.7rem',
                                  fontWeight: 'bold'
                                }}
                              >
                                CONFIRMAR
                              </Button>
                            ) : (
                              <Chip 
                                icon={<CheckCircleIcon style={{ color: 'white', fontSize: '1rem' }} />}
                                label="PAGADO" 
                                size="small"
                                sx={{ bgcolor: 'success.main', color: 'white', fontWeight: 'bold' }}
                              />
                            )}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 'bold', fontSize: '1.1rem', color: ACCENT }}>
                            #{p.bibNumber || '---'}
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontWeight: 'bold' }}>{p.title}</Typography>
                            <Typography variant="caption" color="text.secondary">{p.email}</Typography>
                          </TableCell>
                          <TableCell>
                            {p.teamName ? <Chip label={p.teamName} size="small" variant="outlined" /> : '-'}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                              {race?.data?.title || race?.title || 'Carrera ID: ' + p.race}
                            </Typography>
                            <Typography variant="caption" sx={{ color: ACCENT, fontWeight: 'bold' }}>
                              {allDistances.find(d => d.id === p.distance)?.name || p.distance || '---'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={p.paymentStatus} 
                              size="small"
                              variant={isConfirmed ? "filled" : "outlined"}
                              color={isConfirmed ? "success" : "warning"}
                              sx={{ fontWeight: 'bold' }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Dialog open={!!selectedParticipant} onClose={() => setSelectedParticipant(null)} maxWidth="sm" fullWidth>
            {selectedParticipant && (
              <>
                <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  Ficha de Corredor
                  <Chip size="small" label={`Dorsal #${selectedParticipant.bibNumber || '---'}`} sx={{ bgcolor: ACCENT, color: 'white', fontWeight: 'bold' }} />
                </DialogTitle>
                <DialogContent dividers>
                  <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
                    {/* Foto de Perfil */}
                    <Box sx={{ flexShrink: 0, textAlign: 'center' }}>
                        {selectedParticipant.photoUrl ? (
                            <img src={ensureAbsolute(selectedParticipant.photoUrl)} alt="Foto de perfil" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: '50%', border: `3px solid ${ACCENT}` }} />
                        ) : (
                            <Box sx={{ width: 120, height: 120, borderRadius: '50%', bgcolor: 'action.hover', border: `3px dashed #ccc`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Typography variant="caption" color="text.secondary">Sin foto</Typography>
                            </Box>
                        )}
                    </Box>
                    
                    {/* Datos Principales */}
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography variant="h6" sx={{ lineHeight: 1 }}>{selectedParticipant.title}</Typography>
                        <Typography variant="body2" color="text.secondary">{selectedParticipant.email} | {selectedParticipant.phone}</Typography>
                        <Box sx={{ mt: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Cédula</Typography>
                                <Typography variant="body2" fontWeight="bold">{selectedParticipant.cedula}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Nacimiento</Typography>
                                <Typography variant="body2">{selectedParticipant.birthDate}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Distancia</Typography>
                                <Typography variant="body2" color={ACCENT} fontWeight="bold">{allDistances.find(d => d.id === selectedParticipant.distance)?.name || selectedParticipant.distance}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Talla</Typography>
                                <Typography variant="body2">{selectedParticipant.size || 'N/A'}</Typography>
                            </Box>
                            <Box sx={{ gridColumn: '1 / -1' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Código de Confirmación</Typography>
                                <Typography variant="body2" color={ACCENT} fontWeight="bold">{selectedParticipant.confirmationCode || 'N/A'}</Typography>
                            </Box>
                        </Box>
                    </Box>
                  </Box>

                  {/* Documentos */}
                  <Box sx={{ mt: 4 }}>
                      <Typography variant="subtitle2" sx={{ mb: 2, borderBottom: 1, borderColor: 'divider', pb: 1 }}>Documentos Adjuntos</Typography>
                      {(!selectedParticipant.receiptUrl && !selectedParticipant.studentIdUrl && !selectedParticipant.matriculaUrl) ? (
                          <Typography variant="body2" color="text.secondary">No hay documentos adjuntos a esta inscripción.</Typography>
                      ) : (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              {selectedParticipant.receiptUrl && (
                                  <Box>
                                      <Typography variant="caption" fontWeight="bold">Comprobante de Pago:</Typography>
                                      <img src={ensureAbsolute(selectedParticipant.receiptUrl)} alt="Comprobante" style={{ maxWidth: '100%', borderRadius: 8, marginTop: 4, border: '1px solid #ccc' }} />
                                  </Box>
                              )}
                              {selectedParticipant.studentIdUrl && (
                                  <Box>
                                      <Typography variant="caption" fontWeight="bold">Foto Cédula (Estudiante):</Typography>
                                      <img src={ensureAbsolute(selectedParticipant.studentIdUrl)} alt="Cédula" style={{ maxWidth: '100%', borderRadius: 8, marginTop: 4, border: '1px solid #ccc' }} />
                                  </Box>
                              )}
                              {selectedParticipant.matriculaUrl && (
                                  <Box>
                                      <Typography variant="caption" fontWeight="bold">Foto Matrícula (Estudiante):</Typography>
                                      <img src={ensureAbsolute(selectedParticipant.matriculaUrl)} alt="Matrícula" style={{ maxWidth: '100%', borderRadius: 8, marginTop: 4, border: '1px solid #ccc' }} />
                                  </Box>
                              )}
                          </Box>
                      )}
                  </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                  <Button onClick={() => setSelectedParticipant(null)} color="inherit">Cerrar Ficha</Button>
                  {selectedParticipant.paymentStatus !== 'Confirmado' && (
                      <Button variant="contained" onClick={() => {
                          confirmPayment(selectedParticipant.id);
                          setSelectedParticipant(null);
                      }} sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#E55A00' } }}>Aprobar Inscripción</Button>
                  )}
                </DialogActions>
              </>
            )}
          </Dialog>
        </Box>
      )}
    </Container>
  );
}
