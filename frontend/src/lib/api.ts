// Configuración de la API del backend
// @ts-ignore
export const API_BASE_URL = import.meta.env.SONICJS_API_URL || 'http://localhost:8787';

// Helper para hacer fetch a la API
export async function apiFetch(endpoint: string, options?: RequestInit) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Tipos
export interface Distance {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Race {
  id: string;
  name: string;
  description: string | null;
  date: string;
  startTime: string | null;
  status: string;
  location: string | null;
  price: number;
  imageUrl: string | null;
  distances: Distance[];
  categories?: Category[];
}

export interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  paymentStatus: string;
}

// Funciones de la API
export const api = {
  // Carreras
  getPublicRaces: () => apiFetch('/api/races'),
  getRace: (id: string) => apiFetch(`/api/race/${id}`),
  
  // Registro
  registerParticipant: (data: any) => apiFetch('/api/register', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  // Categorías y distancias
  getCategories: (raceId: string) => apiFetch(`/api/categories/${raceId}`),
  getDistances: (raceId: string) => apiFetch(`/api/distances/${raceId}`),
  
  // Códigos
  validateCode: (code: string, raceId: string) => apiFetch('/api/validate-code', {
    method: 'POST',
    body: JSON.stringify({ code, raceId }),
  }),
  
  // Equipos
  getTeams: () => apiFetch('/api/teams'),
  
  // Admin (protegido por Zero Trust)
  getAdminRaces: () => apiFetch('/api/admin/races'),
  createRace: (data: any) => apiFetch('/api/admin/races', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateRace: (id: string, data: any) => apiFetch(`/api/admin/races/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteRace: (id: string) => apiFetch(`/api/admin/races/${id}`, {
    method: 'DELETE',
  }),
};
