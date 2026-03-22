'use client';

import { useState, useEffect } from 'react';

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
  const [races, setRaces] = useState<Race[]>([]);
  const [selectedRace, setSelectedRace] = useState<Race | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [codes, setCodes] = useState<RegistrationCode[]>([]);
  const [tab, setTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [editRace, setEditRace] = useState<Race | null>(null);
  const [openCodesDialog, setOpenCodesDialog] = useState(false);
  const [codesCount, setCodesCount] = useState(10);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', date: '', location: '', price: 0, maxParticipants: '' });

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

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

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
      showNotification(editRace ? 'Carrera actualizada' : 'Carrera creada', 'success');
      setOpenDialog(false);
      fetch('/api/races').then(r => r.json()).then(d => setRaces(d.races || [])).catch(() => {});
    } else {
      showNotification(data.message, 'error');
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
      showNotification('¡Carrera iniciada!', 'success');
      fetch(`/api/admin/race/${selectedRace.id}`).then(r => r.json()).then(d => setSelectedRace(d.race)).catch(() => {});
    } else {
      showNotification(data.message, 'error');
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
      showNotification(`${data.codes.length} códigos generados`, 'success');
      setOpenCodesDialog(false);
      fetch(`/api/admin/race/${selectedRace.id}`).then(r => r.json()).then(d => setCodes(d.codes || [])).catch(() => {});
    } else {
      showNotification(data.message, 'error');
    }
  };

  const handleDeleteRace = async (id: string) => {
    if (!confirm('¿Eliminar esta carrera?')) return;
    const res = await fetch(`/api/admin/race/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showNotification('Carrera eliminada', 'success');
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

  return (
    <div style={{ backgroundColor: 'var(--mui-palette-background-default)', minHeight: '100vh', color: 'var(--mui-palette-text-primary)' }}>
      {/* Header */}
      <header style={{ backgroundColor: 'var(--mui-palette-background-paper)', borderBottom: '1px solid var(--mui-palette-divider)' }} className="fixed top-0 left-0 right-0 z-50 shadow-md">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <a href="/" style={{ color: ACCENT, textDecoration: 'none', fontSize: '1.25rem', fontWeight: 'bold' }}>← Volver</a>
            <h1 style={{ color: ACCENT, fontSize: '1.25rem', fontWeight: 'bold' }}>Stryd Panama Admin</h1>
          </div>
        </div>
      </header>

      <div className="flex pt-16">
        {/* Sidebar */}
        <aside style={{ backgroundColor: 'var(--mui-palette-background-paper)', borderRight: '1px solid var(--mui-palette-divider)' }} className="w-64 fixed left-0 top-16 bottom-0 overflow-y-auto">
          <div className="p-4">
            <button onClick={() => openEdit()} style={{ width: '100%', padding: '8px 16px', backgroundColor: ACCENT, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              + Nueva Carrera
            </button>
          </div>
          <nav>
            {races.map(race => (
              <button
                key={race.id}
                onClick={() => setSelectedRace(race)}
                style={{ 
                  width: '100%', 
                  textAlign: 'left', 
                  padding: '12px 16px', 
                  backgroundColor: selectedRace?.id === race.id ? 'var(--mui-palette-action-hover)' : 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--mui-palette-divider)',
                  cursor: 'pointer',
                  color: 'var(--mui-palette-text-primary)'
                }}
              >
                <div style={{ fontWeight: 500 }}>{race.name}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--mui-palette-text-secondary)' }}>{formatDate(race.date)}</div>
                <span style={{ 
                  padding: '2px 8px', 
                  borderRadius: '4px', 
                  fontSize: '0.75rem',
                  backgroundColor: race.status === 'active' ? '#10B981' : '#6B7280',
                  color: 'white'
                }}>
                  {race.status === 'active' ? 'Activa' : race.status}
                </span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 ml-64 p-8">
          {!selectedRace ? (
            <p style={{ color: 'var(--mui-palette-text-secondary)' }}>Selecciona una carrera para gestionar</p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{selectedRace.name}</h2>
                <div className="flex gap-2">
                  {selectedRace.status === 'upcoming' && (
                    <button onClick={handleStartRace} style={{ padding: '8px 16px', backgroundColor: '#10B981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      ▶ Iniciar
                    </button>
                  )}
                  <button onClick={() => openEdit(selectedRace)} style={{ padding: '8px 16px', backgroundColor: 'transparent', color: 'var(--mui-palette-text-primary)', border: '1px solid var(--mui-palette-divider)', borderRadius: '8px', cursor: 'pointer' }}>
                    ✏️ Editar
                  </button>
                  <button onClick={() => handleDeleteRace(selectedRace.id)} style={{ padding: '8px 16px', backgroundColor: 'transparent', color: '#EF4444', border: '1px solid #EF4444', borderRadius: '8px', cursor: 'pointer' }}>
                    🗑️ Eliminar
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-4 mb-6">
                <button onClick={() => setTab(0)} style={{ 
                  padding: '8px 16px', 
                  borderRadius: '8px', 
                  backgroundColor: tab === 0 ? ACCENT : 'var(--mui-palette-background-paper)',
                  color: tab === 0 ? 'white' : 'var(--mui-palette-text-primary)',
                  border: '1px solid var(--mui-palette-divider)',
                  cursor: 'pointer'
                }}>Participantes</button>
                <button onClick={() => setTab(1)} style={{ 
                  padding: '8px 16px', 
                  borderRadius: '8px', 
                  backgroundColor: tab === 1 ? ACCENT : 'var(--mui-palette-background-paper)',
                  color: tab === 1 ? 'white' : 'var(--mui-palette-text-primary)',
                  border: '1px solid var(--mui-palette-divider)',
                  cursor: 'pointer'
                }}>Códigos</button>
              </div>

              {tab === 0 && (
                <>
                  <div className="flex justify-end mb-4">
                    <button onClick={exportCSV} style={{ padding: '8px 16px', backgroundColor: 'var(--mui-palette-action-hover)', color: 'var(--mui-palette-text-primary)', border: '1px solid var(--mui-palette-divider)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      ↓ Exportar CSV
                    </button>
                  </div>
                  <div style={{ backgroundColor: 'var(--mui-palette-background-paper)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                    <table style={{ width: '100%' }}>
                      <thead style={{ backgroundColor: 'var(--mui-palette-action-hover)' }}>
                        <tr>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--mui-palette-text-secondary)' }}>Nombre</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--mui-palette-text-secondary)' }}>Email</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--mui-palette-text-secondary)' }}>Teléfono</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--mui-palette-text-secondary)' }}>Talla</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--mui-palette-text-secondary)' }}>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {participants.map(p => (
                          <tr key={p.id} style={{ borderTop: '1px solid var(--mui-palette-divider)' }}>
                            <td style={{ padding: '12px 16px' }}>{p.firstName} {p.lastName}</td>
                            <td style={{ padding: '12px 16px' }}>{p.email}</td>
                            <td style={{ padding: '12px 16px' }}>{p.phone || '-'}</td>
                            <td style={{ padding: '12px 16px' }}>{p.size || '-'}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.875rem', backgroundColor: p.paymentStatus === 'paid' ? '#10B981' : '#F59E0B', color: 'white' }}>
                                {p.paymentStatus === 'paid' ? 'Pagado' : 'Pendiente'}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {participants.length === 0 && (
                          <tr><td colSpan={5} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--mui-palette-text-secondary)' }}>Sin participantes</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {tab === 1 && (
                <div>
                  <button onClick={() => setOpenCodesDialog(true)} style={{ marginBottom: '16px', padding: '8px 16px', backgroundColor: ACCENT, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    + Generar Códigos
                  </button>
                  <div style={{ backgroundColor: 'var(--mui-palette-background-paper)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                    <table style={{ width: '100%' }}>
                      <thead style={{ backgroundColor: 'var(--mui-palette-action-hover)' }}>
                        <tr>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--mui-palette-text-secondary)' }}>Código</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--mui-palette-text-secondary)' }}>Usado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {codes.map(c => (
                          <tr key={c.id} style={{ borderTop: '1px solid var(--mui-palette-divider)' }}>
                            <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>{c.code}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.875rem', backgroundColor: c.used ? '#6B7280' : '#10B981', color: 'white' }}>
                                {c.used ? 'Usado' : 'Disponible'}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {codes.length === 0 && (
                          <tr><td colSpan={2} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--mui-palette-text-secondary)' }}>Sin códigos</td></tr>
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

      {/* Race Dialog */}
      {openDialog && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'var(--mui-palette-background-paper)', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '28rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{editRace ? 'Editar Carrera' : 'Nueva Carrera'}</h3>
              <button onClick={() => setOpenDialog(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: 'var(--mui-palette-text-secondary)' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input type="text" placeholder="Nombre" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--mui-palette-divider)', backgroundColor: 'var(--mui-palette-background-default)', color: 'var(--mui-palette-text-primary)' }} />
              <textarea placeholder="Descripción" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--mui-palette-divider)', backgroundColor: 'var(--mui-palette-background-default)', color: 'var(--mui-palette-text-primary)', minHeight: '60px' }} />
              <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--mui-palette-divider)', backgroundColor: 'var(--mui-palette-background-default)', color: 'var(--mui-palette-text-primary)' }} />
              <input type="text" placeholder="Ubicación" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--mui-palette-divider)', backgroundColor: 'var(--mui-palette-background-default)', color: 'var(--mui-palette-text-primary)' }} />
              <input type="number" placeholder="Precio ($)" value={formData.price} onChange={e => setFormData({...formData, price: parseInt(e.target.value) || 0})} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--mui-palette-divider)', backgroundColor: 'var(--mui-palette-background-default)', color: 'var(--mui-palette-text-primary)' }} />
              <input type="number" placeholder="Cupo Máximo" value={formData.maxParticipants} onChange={e => setFormData({...formData, maxParticipants: e.target.value})} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--mui-palette-divider)', backgroundColor: 'var(--mui-palette-background-default)', color: 'var(--mui-palette-text-primary)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
              <button onClick={() => setOpenDialog(false)} style={{ padding: '8px 16px', border: '1px solid var(--mui-palette-divider)', borderRadius: '8px', backgroundColor: 'transparent', color: 'var(--mui-palette-text-primary)', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleSaveRace} style={{ padding: '8px 16px', backgroundColor: ACCENT, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Codes Dialog */}
      {openCodesDialog && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'var(--mui-palette-background-paper)', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '20rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Generar Códigos</h3>
              <button onClick={() => setOpenCodesDialog(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: 'var(--mui-palette-text-secondary)' }}>✕</button>
            </div>
            <input type="number" value={codesCount} onChange={e => setCodesCount(parseInt(e.target.value) || 10)} style={{ width: '100%', padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--mui-palette-divider)', backgroundColor: 'var(--mui-palette-background-default)', color: 'var(--mui-palette-text-primary)' }} placeholder="Cantidad" />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
              <button onClick={() => setOpenCodesDialog(false)} style={{ padding: '8px 16px', border: '1px solid var(--mui-palette-divider)', borderRadius: '8px', backgroundColor: 'transparent', color: 'var(--mui-palette-text-primary)', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleGenerateCodes} style={{ padding: '8px 16px', backgroundColor: ACCENT, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Generar</button>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div style={{ position: 'fixed', bottom: '16px', right: '16px', padding: '8px 16px', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
          <div style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: notification.type === 'success' ? '#10B981' : '#EF4444', color: 'white' }}>
            {notification.message}
          </div>
        </div>
      )}
    </div>
  );
}