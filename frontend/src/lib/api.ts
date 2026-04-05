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
  const url = `${baseUrl.replace(/\/$/, '')}${endpoint}`;
  
  // Evitar la caché abusiva de Cloudflare CDN en GET
  let finalUrl = url;
  if (!options || !options.method || options.method === 'GET') {
    const divider = finalUrl.includes('?') ? '&' : '?';
    finalUrl = `${finalUrl}${divider}_t=${Date.now()}`;
  }

  const response = await fetch(finalUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`API Error [${response.status}] ${endpoint}:`, errorBody);
    
    if (response.status === 401) {
      const newToken = await getAuthToken(env);
      if (newToken) {
        return apiFetch(endpoint, env, options);
      }
    }
    
    let errorMsg = `API Error: ${response.status}`;
    try {
      const errorJson = JSON.parse(errorBody);
      errorMsg = errorJson.error || errorJson.message || errorMsg;
    } catch {
      errorMsg = errorBody || errorMsg;
    }
    
    throw new Error(errorMsg);
  }

function absolutizeUrls(obj: any, baseUrl: string) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    obj.forEach(item => absolutizeUrls(item, baseUrl));
  } else {
    for (const key in obj) {
      if (typeof obj[key] === 'string' && obj[key].startsWith('/files/')) {
        obj[key] = `${baseUrl}${obj[key]}`;
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        absolutizeUrls(obj[key], baseUrl);
      }
    }
  }
  return obj;
}

  let json = await response.json();

  // FILTRO UNIVERSAL: Eliminar cualquier registro con status 'deleted'
  if (json && json.data && Array.isArray(json.data)) {
    json.data = json.data.filter((item: any) => item.status !== 'deleted');
  } else if (json && json.data && json.data.status === 'deleted') {
    // Si es una petición de un solo objeto y está borrado, devolvemos null
    return null;
  }

  return absolutizeUrls(json, baseUrl.replace(/\/$/, ''));
}

export const api = {
  getAllRaces: (env: any) => apiFetch('/api/collections/races/content', env),
  getPublicRaces: (env: any) => apiFetch('/api/collections/races/content', env),
  getRace: (env: any, id: string) => apiFetch(`/api/content/${id}`, env),
  
  getCollectionContent: (env: any, collection: string, params?: Record<string, string>) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch(`/api/collections/${collection}/content${queryString}`, env);
  },
  
  getCategories: (env: any, raceId: string) => api.getCollectionContent(env, 'categories', { limit: '500' }).then((r: any) => ({ ...r, _raceId: raceId })),
  getDistances: (env: any, raceId?: string) => api.getCollectionContent(env, 'distances', { limit: '500' }),
  getParticipants: (env: any, raceId: string) => api.getCollectionContent(env, 'participants', { race: raceId }),
  
  createContent: (env: any, collectionId: string, title: string, data: any) => 
    apiFetch('/api/content', env, {
      method: 'POST',
      body: JSON.stringify({ 
        collectionId: collectionId, 
        collection_id: collectionId, 
        title, 
        data, 
        status: 'published' 
      }),
    }),
  
  registerParticipant: (env: any, data: any) => {
    // Mapeamos los campos del frontend a los nombres que espera SonicJS en el backend
    const mappedData = {
      ...data,
      race: data.raceId,
      category: data.categoryId,
      distance: data.distanceId,
      paymentStatus: data.paymentMethod,
    };
    return api.createContent(env, 'col-participants-93d1ac21', data.title || `${data.firstName} ${data.lastName}`, mappedData);
  },

  updateContent: (env: any, id: string, payload: any) =>
    apiFetch(`/api/content/${id}`, env, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  updateRace: (env: any, id: string, data: any) =>
    api.updateContent(env, id, data),
};
