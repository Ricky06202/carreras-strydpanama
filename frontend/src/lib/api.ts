/* eslint-disable @typescript-eslint/no-explicit-any */

let config = {
  baseUrl: '',
  email: '',
  password: '',
  authToken: null as string | null
};

export function setupApi(runtime: any) {
  config.baseUrl = runtime?.env?.SONICJS_API_URL || '';
  config.email = runtime?.env?.SONICJS_API_EMAIL || '';
  config.password = runtime?.env?.SONICJS_API_PASSWORD || '';
}

function isConfigured(): boolean {
  return !!(config.baseUrl && config.email && config.password);
}

async function login(): Promise<string | null> {
  if (!config.email || !config.password || !config.baseUrl) {
    console.error('Configuración incompleta:', config);
    return null;
  }
  
  try {
    const response = await fetch(`${config.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: config.email, password: config.password }),
      credentials: 'include',
    });
    
    if (response.ok) {
      const data = await response.json();
      config.authToken = data.token || data.accessToken;
      return config.authToken;
    }
  } catch (e) {
    console.error('Login failed:', e);
  }
  return null;
}

export async function apiFetch(endpoint: string, options?: RequestInit) {
  if (!config.baseUrl) {
    throw new Error('API no inicializada. Llama a setupApi(Astro.locals.runtime) en la página.');
  }
  
  const url = `${config.baseUrl}${endpoint}`;
  
  if (!config.authToken && config.email && config.password) {
    await login();
  }
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(config.authToken ? { 'Authorization': `Bearer ${config.authToken}` } : {}),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401 && config.email && config.password) {
      await login();
      if (config.authToken) {
        return apiFetch(endpoint, options);
      }
    }
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function getCollections() {
  return apiFetch('/api/collections');
}

export async function getCollectionContent(collection: string, params?: Record<string, string>) {
  const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch(`/api/collections/${collection}/content${queryString}`);
}

export async function getContentById(id: string) {
  return apiFetch(`/api/content/${id}`);
}

export async function createContent(collectionId: string, title: string, data: Record<string, any>, status: string = 'published') {
  return apiFetch('/api/content', {
    method: 'POST',
    body: JSON.stringify({
      collectionId,
      title,
      data,
      status,
    }),
  });
}

export async function updateContent(id: string, data: Record<string, any>) {
  return apiFetch(`/api/content/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ data }),
  });
}

export async function deleteContent(id: string) {
  return apiFetch(`/api/content/${id}`, {
    method: 'DELETE',
  });
}

export const api = {
  getCollections,
  getCollectionContent,
  getContentById,
  createContent,
  updateContent,
  deleteContent,
  login: () => login(),
  
  getPublicRaces: () => getCollectionContent('races'),
  getAllRaces: () => getCollectionContent('races'),
  getRace: (id: string) => getContentById(id),
  
  getCategories: (raceId: string) => getCollectionContent('categories', { race: raceId }),
  getDistances: (raceId: string) => getCollectionContent('distances', { race: raceId }),
  
  getParticipants: (raceId: string) => getCollectionContent('participants', { race: raceId }),
  registerParticipant: (data: any) => createContent('participants', data.title || `${data.firstName} ${data.lastName}`, data),
  
  validateCode: async (code: string, raceId: string) => {
    return getCollectionContent('registration_codes', { code, race: raceId });
  },
  
  getTeams: () => getCollectionContent('running_teams'),
};
