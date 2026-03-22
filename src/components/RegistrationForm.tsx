'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, Error as ErrorIcon } from '@mui/icons-material';

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
  price: number;
}

export default function RegistrationForm({ raceId }: { raceId: string }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
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
    const t = getThemeMode();
    setTheme(t);
    document.documentElement.classList.toggle('dark', t === 'dark');
  }, []);

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

  const bgMain = theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50';
  const bgCard = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
  const textMain = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSec = theme === 'dark' ? 'text-gray-300' : 'text-gray-600';
  const inputBg = theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300';

  return (
    <div className={`max-w-2xl mx-auto p-6`}>
      <div className={`${bgCard} rounded-xl shadow-lg p-6`}>
        <div className="flex items-center justify-between mb-6">
          {['Carrera', 'Datos', 'Confirmación'].map((label, i) => (
            <div key={i} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= i ? 'bg-accent text-white' : 'bg-gray-300'}`}>
                {i + 1}
              </div>
              <span className={`ml-2 ${step >= i ? textMain : textSec}`}>{label}</span>
              {i < 2 && <div className={`w-12 h-1 mx-2 ${step > i ? 'bg-accent' : 'bg-gray-300'}`} />}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg flex items-center gap-2 text-red-500">
            <ErrorIcon /> {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-500/20 border border-green-500 rounded-lg flex items-center gap-2 text-green-500">
            <CheckCircle /> {success}
          </div>
        )}

        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${textSec}`}>Carrera</label>
              <select 
                value={selectedRace} 
                onChange={e => setSelectedRace(e.target.value)}
                className={`w-full px-4 py-2 rounded-lg border ${inputBg} ${textMain}`}
              >
                <option value="">Seleccionar...</option>
                {races.map(r => (
                  <option key={r.id} value={r.id}>{r.name} - ${r.price}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${textSec}`}>Código de Descuento (opcional)</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={code} 
                  onChange={e => setCode(e.target.value)}
                  placeholder="Ingrese código"
                  className={`flex-1 px-4 py-2 rounded-lg border ${inputBg} ${textMain}`}
                />
                <button 
                  onClick={validateCode} 
                  disabled={loading}
                  className="px-4 py-2 border border-accent text-accent rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20"
                >
                  Validar
                </button>
              </div>
              {codeValid && (
                <p className={`mt-2 text-sm ${codeValid.valid ? 'text-green-500' : 'text-red-500'}`}>
                  {codeValid.message}
                </p>
              )}
            </div>
            <div className="flex justify-end pt-4">
              <button 
                onClick={() => setStep(1)} 
                disabled={!selectedRace}
                className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${textSec}`}>Nombre *</label>
                <input 
                  type="text" 
                  value={formData.firstName} 
                  onChange={e => setFormData({...formData, firstName: e.target.value})}
                  className={`w-full px-4 py-2 rounded-lg border ${inputBg} ${textMain}`}
                  required 
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${textSec}`}>Apellido *</label>
                <input 
                  type="text" 
                  value={formData.lastName} 
                  onChange={e => setFormData({...formData, lastName: e.target.value})}
                  className={`w-full px-4 py-2 rounded-lg border ${inputBg} ${textMain}`}
                  required 
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${textSec}`}>Email *</label>
                <input 
                  type="email" 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className={`w-full px-4 py-2 rounded-lg border ${inputBg} ${textMain}`}
                  required 
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${textSec}`}>Teléfono</label>
                <input 
                  type="tel" 
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className={`w-full px-4 py-2 rounded-lg border ${inputBg} ${textMain}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${textSec}`}>Fecha de Nacimiento</label>
                <input 
                  type="date" 
                  value={formData.birthDate} 
                  onChange={e => setFormData({...formData, birthDate: e.target.value})}
                  className={`w-full px-4 py-2 rounded-lg border ${inputBg} ${textMain}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${textSec}`}>Género</label>
                <select 
                  value={formData.gender} 
                  onChange={e => setFormData({...formData, gender: e.target.value})}
                  className={`w-full px-4 py-2 rounded-lg border ${inputBg} ${textMain}`}
                >
                  <option value="">Seleccionar...</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                  <option value="O">Otro</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className={`block text-sm font-medium mb-1 ${textSec}`}>Talla de Camiseta</label>
                <select 
                  value={formData.size} 
                  onChange={e => setFormData({...formData, size: e.target.value})}
                  className={`w-full px-4 py-2 rounded-lg border ${inputBg} ${textMain}`}
                >
                  <option value="">Seleccionar...</option>
                  {sizes.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-between pt-4">
              <button onClick={() => setStep(0)} className="px-6 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                Atrás
              </button>
              <button 
                onClick={handleSubmit} 
                disabled={loading || !formData.firstName || !formData.lastName || !formData.email}
                className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
              >
                {loading ? 'Procesando...' : 'Confirmar Inscripción'}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">¡Inscripción Exitosa!</h3>
            <p className={textSec}>Te hemos enviado un correo de confirmación.</p>
          </div>
        )}
      </div>
    </div>
  );
}