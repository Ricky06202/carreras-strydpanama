/* eslint-disable @typescript-eslint/no-explicit-any */
// Configuración de la API del backend SonicJS

let cachedConfig: { baseUrl: string; email: string; password: string } | null = null;

function getEnvVar(key: string, runtime?: any): string | undefined {
  if (runtime?.env?.[key]) return runtime.env[key];
  if (typeof process !== 'undefined' && process.env?.[key]) {
    return process.env[key];
  }
  if (typeof globalThis !== 'undefined') {
    const env = (globalThis as any).env;
    if (env?.[key]) return env[key];
  }
  return undefined;
}

function initConfig(runtime?: any) {
  if (cachedConfig) return cachedConfig;
  
  const baseUrl = getEnvVar('SONICJS_API_URL', runtime) || '';
  const email = getEnvVar('SONICJS_API_EMAIL', runtime) || '';
  const password = getEnvVar('SONICJS_API_PASSWORD', runtime) || '';
  
  cachedConfig = { baseUrl, email, password };
  return cachedConfig;
}

let authToken: string | null = null;

async function login(): Promise<string | null> {
  const config = initConfig();
  if (!config.email || !config.password || !config.baseUrl) {
    console.error('Missing config:', config);
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
      authToken = data.token || data.accessToken;
      return authToken;
    }
  } catch (e) {
    console.error('Login failed:', e);
  }
  return null;
}

export async function apiFetch(endpoint: string, options?: RequestInit) {
  const config = initConfig();
  
  if (!config.baseUrl) {
    throw new Error('SONICJS_API_URL not configured');
  }
  
  const url = `${config.baseUrl}${endpoint}`;
  
  if (!authToken && config.email && config.password) {
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
    if (response.status === 401 && config.email && config.password) {
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
