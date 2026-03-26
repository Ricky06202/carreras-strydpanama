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
  const baseUrl = env.SONICJS_API_URL;
  if (!baseUrl) throw new Error('SONICJS_API_URL is missing in Cloudflare ENV');

  const token = await getAuthToken(env);
  const url = `${baseUrl}${endpoint}`;

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

export const api = {
  getAllRaces: (env: any) => apiFetch('/api/collections/races/content', env),
  getPublicRaces: (env: any) => apiFetch('/api/collections/races/content', env),
  getRace: (env: any, id: string) => apiFetch(`/api/content/${id}`, env),
  
  getCollectionContent: (env: any, collection: string, params?: Record<string, string>) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch(`/api/collections/${collection}/content${queryString}`, env);
  },
  
  getCategories: (env: any, raceId: string) => api.getCollectionContent(env, 'categories', { race: raceId }),
  getDistances: (env: any, raceId: string) => api.getCollectionContent(env, 'distances', { race: raceId }),
  getParticipants: (env: any, raceId: string) => api.getCollectionContent(env, 'participants', { race: raceId }),
  
  createContent: (env: any, collectionId: string, title: string, data: any) => 
    apiFetch('/api/content', env, {
      method: 'POST',
      body: JSON.stringify({ collectionId, title, data, status: 'published' }),
    }),
  
  registerParticipant: (env: any, data: any) => 
    api.createContent(env, 'participants', data.title || `${data.firstName} ${data.lastName}`, data),
};
