import { apiFetch } from './api';

export interface SessionRunner extends VerifiedRunner {}

/** Verifies a session token and returns the runner + collection ID. */
export async function verifySessionAndGetRunner(sessionToken: string, env: any): Promise<VerifiedRunner> {
  const [runnersRes, collectionsRes] = await Promise.all([
    apiFetch('/api/collections/runners/content?limit=2000', env),
    apiFetch('/api/collections', env),
  ]);

  const runner = (runnersRes?.data || []).find(
    (r: any) => r.data?.sessionToken === sessionToken
  );
  if (!runner) throw new Error('Sesión inválida. Inicia sesión nuevamente.');

  const expiry = runner.data?.sessionExpiry;
  if (!expiry || Date.now() > expiry) throw new Error('Sesión expirada. Inicia sesión nuevamente.');

  const runnersCol = (collectionsRes?.data || []).find((c: any) => c.name === 'runners');
  const colId = runnersCol?.id || runner.collectionId;

  return { runner, cedula: runner.data?.cedula, colId };
}

export interface VerifiedRunner {
  runner: any;
  cedula: string;
  colId: string;
}

/** Verifies a STRYD-XXXX confirmation code and returns the runner + collection ID. */
export async function verifyCodeAndGetRunner(code: string, env: any): Promise<VerifiedRunner> {
  const normalized = code.trim().toUpperCase();

  // Fetch participants and runners in parallel
  const [participantsRes, runnersRes, collectionsRes] = await Promise.all([
    apiFetch('/api/collections/participants/content?limit=5000', env),
    apiFetch('/api/collections/runners/content?limit=2000', env),
    apiFetch('/api/collections', env),
  ]);

  const match = (participantsRes?.data || []).find(
    (p: any) => p.data?.confirmationCode === normalized
  );
  if (!match) throw new Error('Código no encontrado. Verifica que sea correcto.');

  const cedula = match.data?.cedula;
  if (!cedula) throw new Error('El registro no tiene cédula asociada.');

  const runner = (runnersRes?.data || []).find(
    (r: any) => (r.data?.cedula || '').toLowerCase().trim() === cedula.toLowerCase().trim()
  );
  if (!runner) throw new Error('No se encontró un perfil de corredor para este código.');

  const runnersCol = (collectionsRes?.data || []).find((c: any) => c.name === 'runners');
  const colId = runnersCol?.id || runner.collectionId;

  return { runner, cedula, colId };
}
