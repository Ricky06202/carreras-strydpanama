'use client';

import { useState, useEffect } from 'react';

const ACCENT = '#FF6B00';

interface Race {
  id: string;
  name: string;
  price: number;
}

export default function RegistrationForm({ raceId }: { raceId: string }) {
  const [step, setStep] = useState(0);
  const [races, setRaces] = useState<Race[]>([]);
  const [selectedRace, setSelectedRace] = useState(raceId);
  const [code, setCode] = useState('');
  const [codeValid, setCodeValid] = useState<{ valid: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    birthDate: '', gender: '', size: ''
  });

  useEffect(() => {
    fetch('/api/races').then(r => r.json()).then(d => setRaces(d.races || [])).catch(() => {});
  }, []);

  const validateCode = async () => {
    if (!code.trim()) {
      setCodeValid({ valid: false, message: 'Ingrese un código' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/validate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, raceId: selectedRace })
      });
      const data = await res.json();
      setCodeValid(data.valid ? { valid: true, message: 'Código válido' } : { valid: false, message: data.message || 'Código inválido' });
    } catch {
      setCodeValid({ valid: false, message: 'Error al validar código' });
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, code, raceId: selectedRace })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al registrar');
      setSuccess(data.paymentUrl || 'Registro exitoso');
      setStep(2);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

  return (
    <div style={{ backgroundColor: 'var(--mui-palette-background-paper)', borderRadius: '12px', padding: '24px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
      {/* Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        {['Carrera', 'Datos', 'Confirmación'].map((label, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ 
              width: '32px', 
              height: '32px', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              backgroundColor: step >= i ? ACCENT : 'var(--mui-palette-text-secondary)',
              color: step >= i ? 'white' : 'var(--mui-palette-text-secondary)',
              fontWeight: 'bold'
            }}>
              {i + 1}
            </div>
            <span style={{ marginLeft: '8px', color: 'var(--mui-palette-text-primary)' }}>{label}</span>
            {i < 2 && <div style={{ width: '48px', height: '2px', margin: '0 8px', backgroundColor: step > i ? ACCENT : 'var(--mui-palette-text-secondary)' }} />}
          </div>
        ))}
      </div>

      {error && (
        <div style={{ padding: '12px', backgroundColor: '#FEE2E2', color: '#DC2626', borderRadius: '8px', marginBottom: '16px' }}>
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div style={{ padding: '12px', backgroundColor: '#D1FAE5', color: '#059669', borderRadius: '8px', marginBottom: '16px' }}>
          ✅ {success}
        </div>
      )}

      {step === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '4px', color: 'var(--mui-palette-text-secondary)' }}>Carrera *</label>
            <select 
              value={selectedRace} 
              onChange={(e) => setSelectedRace(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--mui-palette-divider)', backgroundColor: 'var(--mui-palette-background-default)', color: 'var(--mui-palette-text-primary)' }}
            >
              <option value="">Seleccionar...</option>
              {races.map(r => (
                <option key={r.id} value={r.id}>{r.name} - ${r.price}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input 
              type="text" 
              value={code} 
              onChange={(e) => setCode(e.target.value)}
              placeholder="Código de descuento (opcional)"
              style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--mui-palette-divider)', backgroundColor: 'var(--mui-palette-background-default)', color: 'var(--mui-palette-text-primary)' }}
            />
            <button 
              onClick={validateCode} 
              disabled={loading}
              style={{ padding: '8px 16px', border: `1px solid ${ACCENT}`, color: ACCENT, backgroundColor: 'transparent', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              Validar
            </button>
          </div>
          
          {codeValid && (
            <p style={{ fontSize: '0.875rem', color: codeValid.valid ? '#059669' : '#DC2626' }}>
              {codeValid.message}
            </p>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button 
              onClick={() => setStep(1)} 
              disabled={!selectedRace}
              style={{ padding: '12px 24px', backgroundColor: !selectedRace ? '#9CA3AF' : ACCENT, color: 'white', border: 'none', borderRadius: '8px', cursor: !selectedRace ? 'not-allowed' : 'pointer' }}
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '4px', color: 'var(--mui-palette-text-secondary)' }}>Nombre *</label>
              <input 
                type="text" 
                value={formData.firstName} 
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--mui-palette-divider)', backgroundColor: 'var(--mui-palette-background-default)', color: 'var(--mui-palette-text-primary)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '4px', color: 'var(--mui-palette-text-secondary)' }}>Apellido *</label>
              <input 
                type="text" 
                value={formData.lastName} 
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--mui-palette-divider)', backgroundColor: 'var(--mui-palette-background-default)', color: 'var(--mui-palette-text-primary)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '4px', color: 'var(--mui-palette-text-secondary)' }}>Email *</label>
              <input 
                type="email" 
                value={formData.email} 
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--mui-palette-divider)', backgroundColor: 'var(--mui-palette-background-default)', color: 'var(--mui-palette-text-primary)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '4px', color: 'var(--mui-palette-text-secondary)' }}>Teléfono</label>
              <input 
                type="tel" 
                value={formData.phone} 
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--mui-palette-divider)', backgroundColor: 'var(--mui-palette-background-default)', color: 'var(--mui-palette-text-primary)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '4px', color: 'var(--mui-palette-text-secondary)' }}>Fecha de Nacimiento</label>
              <input 
                type="date" 
                value={formData.birthDate} 
                onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--mui-palette-divider)', backgroundColor: 'var(--mui-palette-background-default)', color: 'var(--mui-palette-text-primary)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '4px', color: 'var(--mui-palette-text-secondary)' }}>Género</label>
              <select 
                value={formData.gender} 
                onChange={(e) => setFormData({...formData, gender: e.target.value})}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--mui-palette-divider)', backgroundColor: 'var(--mui-palette-background-default)', color: 'var(--mui-palette-text-primary)' }}
              >
                <option value="">Seleccionar...</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="O">Otro</option>
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '4px', color: 'var(--mui-palette-text-secondary)' }}>Talla de Camiseta</label>
              <select 
                value={formData.size} 
                onChange={(e) => setFormData({...formData, size: e.target.value})}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--mui-palette-divider)', backgroundColor: 'var(--mui-palette-background-default)', color: 'var(--mui-palette-text-primary)' }}
              >
                <option value="">Seleccionar...</option>
                {sizes.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
            <button onClick={() => setStep(0)} style={{ padding: '12px 24px', border: '1px solid var(--mui-palette-divider)', borderRadius: '8px', backgroundColor: 'transparent', color: 'var(--mui-palette-text-primary)', cursor: 'pointer' }}>
              Atrás
            </button>
            <button 
              onClick={handleSubmit}
              disabled={loading || !formData.firstName || !formData.lastName || !formData.email}
              style={{ padding: '12px 24px', backgroundColor: (!formData.firstName || !formData.lastName || !formData.email) ? '#9CA3AF' : ACCENT, color: 'white', border: 'none', borderRadius: '8px', cursor: (!formData.firstName || !formData.lastName || !formData.email) ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Procesando...' : 'Confirmar Inscripción'}
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{ fontSize: '4rem', marginBottom: '16px' }}>✅</div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '8px', color: 'var(--mui-palette-text-primary)' }}>¡Inscripción Exitosa!</h3>
          <p style={{ color: 'var(--mui-palette-text-secondary)' }}>Te hemos enviado un correo de confirmación.</p>
        </div>
      )}
    </div>
  );
}