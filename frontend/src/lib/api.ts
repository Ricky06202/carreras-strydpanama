/* eslint-disable @typescript-eslint/no-explicit-any */

async function getAuthToken(env: any): Promise<string | null> {
  const { SONICJS_API_URL, SONICJS_API_EMAIL, SONICJS_API_PASSWORD } = env;
  
  if (!SONICJS_API_URL || !SONICJS_API_EMAIL || !SONICJS_API_PASSWORD) return null;

  try {
    const response = await fetch(`${SONICJS_API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: SONICJS_API_EMAIL, password: SONICJS_API_PASSWORD }),
      credentials: 'include',
    });
    if (response.ok) {
      const data = await response.json();
      return data.token || data.accessToken;
    }
  } catch (e) {
    console.error('Login error:', e);
  }
  return null;
}

export async function apiFetch(endpoint: string, env: any, options?: RequestInit) {
  let baseUrl = env.SONICJS_API_URL;
  if (!baseUrl) throw new Error('SONICJS_API_URL is missing in Cloudflare ENV');

  // Asegurar que usamos el subdominio api.carreras2 si no está presente
  // según la regla de AGENTS.md y el comportamiento detectado
  if (typeof baseUrl === 'string' && !baseUrl.includes('api.')) {
    baseUrl = baseUrl.replace(/^(https?:\/\/)([^.]+\.)/, '$1api.carreras2.');
  }

  const token = await getAuthToken(env);
  const url = `${baseUrl.replace(/\/$/, '')}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      const newToken = await getAuthToken(env);
      if (newToken) {
        return apiFetch(endpoint, env, options);
      }
    }
    const error = await response.json().catch(() => ({ error: 'Unknown' }));
    throw new Error(`API Error: ${error.error || response.status}`);
  }

  return response.json();
}

// IDs de colecciones según AGENTS.md
const COLLECTIONS = {
  RACES: 'col-races-fa0146f5',
  CATEGORIES: 'col-categories-26d3d058',
  DISTANCES: 'col-distances-93815733',
  PARTICIPANTS: 'col-participants-93d1ac21',
  RUNNING_TEAMS: 'col-running_teams-5c6748a6',
};

export const api = {
  getAllRaces: (env: any) => apiFetch(`/api/collections/${COLLECTIONS.RACES}/content`, env),
  getPublicRaces: (env: any) => apiFetch(`/api/collections/${COLLECTIONS.RACES}/content`, env),
  getRace: (env: any, id: string) => apiFetch(`/api/content/${id}`, env),
  
  getCollectionContent: (env: any, collectionId: string, params?: Record<string, string>) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch(`/api/collections/${collectionId}/content${queryString}`, env);
  },
  
  getCategories: (env: any, raceId: string) => api.getCollectionContent(env, COLLECTIONS.CATEGORIES, { race: raceId }),
  getDistances: (env: any, raceId: string) => api.getCollectionContent(env, COLLECTIONS.DISTANCES, { race: raceId }),
  getParticipants: (env: any, raceId: string) => api.getCollectionContent(env, COLLECTIONS.PARTICIPANTS, { race: raceId }),
  
  createContent: (env: any, collectionId: string, title: string, data: any) => 
    apiFetch('/api/content', env, {
      method: 'POST',
      body: JSON.stringify({ collectionId, title, data, status: 'published' }),
    }),
  
  registerParticipant: (env: any, data: any) => 
    api.createContent(env, COLLECTIONS.PARTICIPANTS, data.title || `${data.firstName} ${data.lastName}`, data),
};
