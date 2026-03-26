// Configuración de la API del backend SonicJS
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
  raceId?: string;
}

export interface Category {
  id: string;
  name: string;
  raceId?: string;
}

export interface Race {
  id: string;
  data: {
    name: string;
    description?: string;
    date: string;
    startTime?: string;
    location?: string;
    status?: string;
    price?: number;
    imageUrl?: string;
    technicalInfo?: string;
    termsAndConditions?: string;
    maxParticipants?: number;
    showTimer?: boolean;
    showShirtSize?: boolean;
    routeGpxUrl?: string;
    routeGeoJson?: string;
  };
}

export interface Participant {
  id: string;
  data: {
    firstName: string;
    lastName: string;
    email: string;
    paymentStatus?: string;
  };
}

// Funciones de la API para SonicJS
export const api = {
  // Carreras - SonicJS usa /api/content y /api/collections/races/content
  getPublicRaces: () => apiFetch('/api/collections/races/content?status=accepting'),
  getAllRaces: () => apiFetch('/api/collections/races/content'),
  getRace: (id: string) => apiFetch(`/api/content/${id}`),
  
  // Categorías
  getCategories: (raceId: string) => apiFetch(`/api/collections/categories/content?race=${raceId}`),
  
  // Distancias
  getDistances: (raceId: string) => apiFetch(`/api/collections/distances/content?race=${raceId}`),
  
  // Participantes
  getParticipants: (raceId: string) => apiFetch(`/api/collections/participants/content?race=${raceId}`),
  registerParticipant: (data: any) => apiFetch('/api/content', {
    method: 'POST',
    body: JSON.stringify({
      collection: 'participants',
      data: data
    }),
  }),
  
  // Códigos
  validateCode: (code: string, raceId: string) => apiFetch(`/api/collections/registration_codes/content?code=${code}&race=${raceId}`),
  
  // Equipos
  getTeams: () => apiFetch('/api/collections/running_teams/content'),
  
  // Admin - requiere autenticación
  login: (email: string, password: string) => apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),
};
