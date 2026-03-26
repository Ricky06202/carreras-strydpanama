// Configuración de la API del backend SonicJS
// @ts-ignore
export const API_BASE_URL = import.meta.env.SONICJS_API_URL || 'http://localhost:8787';

// Credenciales para autenticación automática
// @ts-ignore
const API_EMAIL = import.meta.env.SONICJS_API_EMAIL || '';
// @ts-ignore
const API_PASSWORD = import.meta.env.SONICJS_API_PASSWORD || '';

// Token en memoria
let authToken: string | null = null;

// Función para hacer login y obtener token
async function login(): Promise<string | null> {
  if (!API_EMAIL || !API_PASSWORD) return null;
  
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: API_EMAIL, password: API_PASSWORD }),
      credentials: 'include',
    });
    
    if (response.ok) {
      const data = await response.json();
      authToken = data.token || data.accessToken;
      return authToken;
    }
  } catch (e) {
    console.error('Login failed:', e);
  }
  return null;
}

// Helper para hacer fetch a la API
export async function apiFetch(endpoint: string, options?: RequestInit) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Obtener token si no existe y hay credenciales
  if (!authToken && API_EMAIL && API_PASSWORD) {
    await login();
  }
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    // Si es 401, intentar login de nuevo
    if (response.status === 401 && API_EMAIL && API_PASSWORD) {
      await login();
      if (authToken) {
        return apiFetch(endpoint, options);
      }
    }
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Obtener todas las colecciones
export async function getCollections() {
  return apiFetch('/api/collections');
}

// Obtener contenido de una colección
export async function getCollectionContent(collection: string, params?: Record<string, string>) {
  const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch(`/api/collections/${collection}/content${queryString}`);
}

// Obtener contenido por ID
export async function getContentById(id: string) {
  return apiFetch(`/api/content/${id}`);
}

// Crear contenido (requiere auth)
export async function createContent(collectionId: string, title: string, data: Record<string, any>, status: string = 'published') {
  return apiFetch('/api/content', {
    method: 'POST',
    body: JSON.stringify({
      collectionId: collectionId,
      title,
      data,
      status,
    }),
  });
}

// Actualizar contenido (requiere auth)
export async function updateContent(id: string, data: Record<string, any>) {
  return apiFetch(`/api/content/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ data }),
  });
}

// Eliminar contenido (requiere auth)
export async function deleteContent(id: string) {
  return apiFetch(`/api/content/${id}`, {
    method: 'DELETE',
  });
}

// Alias para compatibilidad
export const api = {
  getCollections,
  getCollectionContent,
  getContentById,
  createContent,
  updateContent,
  deleteContent,
  login: () => login(),
  
  // Carreras
  getPublicRaces: () => getCollectionContent('races', { status: 'published' }),
  getAllRaces: () => getCollectionContent('races'),
  getRace: (id: string) => getContentById(id),
  
  // Categorías
  getCategories: (raceId: string) => getCollectionContent('categories', { race: raceId }),
  
  // Distancias
  getDistances: (raceId: string) => getCollectionContent('distances', { race: raceId }),
  
  // Participantes
  getParticipants: (raceId: string) => getCollectionContent('participants', { race: raceId }),
  registerParticipant: (data: any) => createContent('participants', data.title || `${data.firstName} ${data.lastName}`, data),
  
  // Códigos
  validateCode: async (code: string, raceId: string) => {
    const result = await getCollectionContent('registration_codes', { code, race: raceId });
    return result;
  },
  
  // Equipos
  getTeams: () => getCollectionContent('running_teams'),
};
