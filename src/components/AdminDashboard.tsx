'use client';

import { useState, useEffect } from 'react';
import { SaveAlt, Add, PlayArrow, Delete, Edit } from '@mui/icons-material';

function getThemeMode(): 'light' | 'dark' {
  if (typeof window !== 'undefined') {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 
           (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }
  return 'light';
}

interface Race {
  id: string;
  name: string;
  description: string;
  date: string;
  status: string;
  location: string;
  price: number;
  maxParticipants: number;
  startTimestamp: number;
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

export default function AdminDashboard() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [races, setRaces] = useState<Race[]>([]);
  const [selectedRace, setSelectedRace] = useState<Race | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [codes, setCodes] = useState<RegistrationCode[]>([]);
  const [tab, setTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [editRace, setEditRace] = useState<Race | null>(null);
  const [openCodesDialog, setOpenCodesDialog] = useState(false);
  const [codesCount, setCodesCount] = useState(10);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [formData, setFormData] = useState({ name: '', description: '', date: '', location: '', price: 0, maxParticipants: '' });

  useEffect(() => {
    const t = getThemeMode();
    setTheme(t);
    document.documentElement.classList.toggle('dark', t === 'dark');
  }, []);

  useEffect(() => {
    fetch('/api/races').then(r => r.json()).then(d => setRaces(d.races || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedRace) {
      fetch(`/api/admin/race/${selectedRace.id}`).then(r => r.json()).then(d => {
        setSelectedRace(d.race);
        setParticipants(d.participants || []);
        setCodes(d.codes || []);
      }).catch(() => {});
    }
  }, [selectedRace?.id]);

  const handleSaveRace = async () => {
    const method = editRace ? 'PUT' : 'POST';
    const url = editRace ? `/api/admin/race/${editRace.id}` : '/api/admin/race';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants) : null })
    });
    const data = await res.json();
    if (res.ok) {
      setSnackbar({ open: true, message: editRace ? 'Carrera actualizada' : 'Carrera creada', severity: 'success' });
      setOpenDialog(false);
      fetch('/api/races').then(r => r.json()).then(d => setRaces(d.races || [])).catch(() => {});
    } else {
      setSnackbar({ open: true, message: data.message, severity: 'error' });
    }
  };

  const handleStartRace = async () => {
    if (!selectedRace) return;
    const res = await fetch('/api/admin/start-race', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raceId: selectedRace.id })
    });
    const data = await res.json();
    if (res.ok) {
      setSnackbar({ open: true, message: '¡Carrera iniciada!', severity: 'success' });
      fetch(`/api/admin/race/${selectedRace.id}`).then(r => r.json()).then(d => {
        setSelectedRace(d.race);
      }).catch(() => {});
    } else {
      setSnackbar({ open: true, message: data.message, severity: 'error' });
    }
  };

  const handleGenerateCodes = async () => {
    if (!selectedRace) return;
    const res = await fetch('/api/admin/generate-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raceId: selectedRace.id, count: codesCount })
    });
    const data = await res.json();
    if (res.ok) {
      setSnackbar({ open: true, message: `${data.codes.length} códigos generados`, severity: 'success' });
      setOpenCodesDialog(false);
      fetch(`/api/admin/race/${selectedRace.id}`).then(r => r.json()).then(d => setCodes(d.codes || [])).catch(() => {});
    } else {
      setSnackbar({ open: true, message: data.message, severity: 'error' });
    }
  };

  const handleDeleteRace = async (id: string) => {
    if (!confirm('¿Eliminar esta carrera?')) return;
    const res = await fetch(`/api/admin/race/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setSnackbar({ open: true, message: 'Carrera eliminada', severity: 'success' });
      if (selectedRace?.id === id) setSelectedRace(null);
      fetch('/api/races').then(r => r.json()).then(d => setRaces(d.races || [])).catch(() => {});
    }
  };

  const exportCSV = () => {
    const headers = ['Nombre', 'Apellido', 'Email', 'Teléfono', 'Talla', 'Estado'];
    const rows = participants.map(p => [p.firstName, p.lastName, p.email, p.phone, p.size, p.paymentStatus].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `participantes-${selectedRace?.name || 'race'}.csv`;
    a.click();
  };

  const openEdit = (race?: Race) => {
    if (race) {
      setEditRace(race);
      setFormData({ name: race.name, description: race.description || '', date: race.date, location: race.location || '', price: race.price, maxParticipants: race.maxParticipants?.toString() || '' });
    } else {
      setEditRace(null);
      setFormData({ name: '', description: '', date: '', location: '', price: 0, maxParticipants: '' });
    }
    setOpenDialog(true);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('es-PA');

  const bgMain = theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50';
  const bgCard = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
  const textMain = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSec = theme === 'dark' ? 'text-gray-300' : 'text-gray-600';

  return (
    <div className={`min-h-screen ${bgMain} ${textMain}`}>
      <header className={`fixed top-0 left-0 right-0 z-50 ${bgCard} shadow-md`}>
        <div className="flex items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold text-accent">Stryd Panama Admin</h1>
        </div>
      </header>

      <div className="flex pt-16">
        <aside className={`w-64 fixed left-0 top-16 bottom-0 ${bgCard} border-r dark:border-gray-700 overflow-y-auto`}>
          <div className="p-4">
            <button onClick={() => openEdit()} className={`w-full px-4 py-2 bg-accent text-white rounded-lg flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors`}>
              <Add className="w-5 h-5" /> Nueva Carrera
            </button>
          </div>
          <nav>
            {races.map(race => (
              <button
                key={race.id}
                onClick={() => setSelectedRace(race)}
                className={`w-full text-left px-4 py-3 flex items-center justify-between border-b dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${selectedRace?.id === race.id ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
              >
                <div>
                  <div className="font-medium">{race.name}</div>
                  <div className="text-sm text-gray-500">{formatDate(race.date)}</div>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${race.status === 'active' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
                  {race.status === 'active' ? 'Activa' : race.status}
                </span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 ml-64 p-8">
          {!selectedRace ? (
            <p className="text-gray-500">Selecciona una carrera para gestionar</p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">{selectedRace.name}</h2>
                <div className="flex gap-2">
                  {selectedRace.status === 'upcoming' && (
                    <button onClick={handleStartRace} className="px-4 py-2 bg-green-500 text-white rounded-lg flex items-center gap-1 hover:bg-green-600">
                      <PlayArrow className="w-5 h-5" /> Iniciar Carrera
                    </button>
                  )}
                  <button onClick={() => openEdit(selectedRace)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg flex items-center gap-1 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <Edit className="w-5 h-5" /> Editar
                  </button>
                  <button onClick={() => handleDeleteRace(selectedRace.id)} className="px-4 py-2 border border-red-500 text-red-500 rounded-lg flex items-center gap-1 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <Delete className="w-5 h-5" /> Eliminar
                  </button>
                </div>
              </div>

              <div className="flex gap-4 mb-6">
                <button onClick={() => setTab(0)} className={`px-4 py-2 rounded-lg ${tab === 0 ? 'bg-accent text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Participantes</button>
                <button onClick={() => setTab(1)} className={`px-4 py-2 rounded-lg ${tab === 1 ? 'bg-accent text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Códigos</button>
              </div>

              {tab === 0 && (
                <>
                  <div className="flex justify-end mb-4">
                    <button onClick={exportCSV} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center gap-2 hover:bg-gray-300 dark:hover:bg-gray-600">
                      <SaveAlt className="w-5 h-5" /> Exportar CSV
                    </button>
                  </div>
                  <div className={`${bgCard} rounded-lg shadow overflow-hidden`}>
                    <table className="w-full">
                      <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left">Nombre</th>
                          <th className="px-4 py-3 text-left">Email</th>
                          <th className="px-4 py-3 text-left">Teléfono</th>
                          <th className="px-4 py-3 text-left">Talla</th>
                          <th className="px-4 py-3 text-left">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {participants.map(p => (
                          <tr key={p.id} className="border-t dark:border-gray-700">
                            <td className="px-4 py-3">{p.firstName} {p.lastName}</td>
                            <td className="px-4 py-3">{p.email}</td>
                            <td className="px-4 py-3">{p.phone || '-'}</td>
                            <td className="px-4 py-3">{p.size || '-'}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-sm ${p.paymentStatus === 'paid' ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'}`}>
                                {p.paymentStatus === 'paid' ? 'Pagado' : 'Pendiente'}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {participants.length === 0 && (
                          <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Sin participantes</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {tab === 1 && (
                <div>
                  <button onClick={() => setOpenCodesDialog(true)} className="mb-4 px-4 py-2 bg-accent text-white rounded-lg flex items-center gap-2 hover:bg-orange-600">
                    <Add className="w-5 h-5" /> Generar Códigos
                  </button>
                  <div className={`${bgCard} rounded-lg shadow overflow-hidden`}>
                    <table className="w-full">
                      <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left">Código</th>
                          <th className="px-4 py-3 text-left">Usado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {codes.map(c => (
                          <tr key={c.id} className="border-t dark:border-gray-700">
                            <td className="px-4 py-3 font-mono">{c.code}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-sm ${c.used ? 'bg-gray-500 text-white' : 'bg-green-500 text-white'}`}>
                                {c.used ? 'Usado' : 'Disponible'}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {codes.length === 0 && (
                          <tr><td colSpan={2} className="px-4 py-8 text-center text-gray-500">Sin códigos</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {openDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`${bgCard} rounded-xl p-6 w-full max-w-md`}>
            <h3 className="text-xl font-bold mb-4">{editRace ? 'Editar Carrera' : 'Nueva Carrera'}</h3>
            <div className="space-y-4">
              <input type="text" placeholder="Nombre" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
              <textarea placeholder="Descripción" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" rows={2} />
              <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
              <input type="text" placeholder="Ubicación" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
              <input type="number" placeholder="Precio ($)" value={formData.price} onChange={e => setFormData({...formData, price: parseInt(e.target.value) || 0})} className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
              <input type="number" placeholder="Cupo Máximo" value={formData.maxParticipants} onChange={e => setFormData({...formData, maxParticipants: e.target.value})} className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setOpenDialog(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">Cancelar</button>
              <button onClick={handleSaveRace} className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-orange-600">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {openCodesDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`${bgCard} rounded-xl p-6 w-full max-w-sm`}>
            <h3 className="text-xl font-bold mb-4">Generar Códigos</h3>
            <input type="number" value={codesCount} onChange={e => setCodesCount(parseInt(e.target.value) || 10)} className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" placeholder="Cantidad" />
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setOpenCodesDialog(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">Cancelar</button>
              <button onClick={handleGenerateCodes} className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-orange-600">Generar</button>
            </div>
          </div>
        </div>
      )}

      {snackbar.open && (
        <div className="fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg">
          <div className={`px-4 py-2 rounded-lg ${snackbar.severity === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
            {snackbar.message}
          </div>
        </div>
      )}
    </div>
  );
}