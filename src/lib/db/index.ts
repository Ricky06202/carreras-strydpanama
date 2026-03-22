import { drizzle } from 'drizzle-orm/d1';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from './schema';

export type Database = DrizzleD1Database<typeof schema>;

export function getDb(env: unknown): Database {
  if (!env) {
    throw new Error('Environment not available');
  }
  return drizzle(env as any, { schema });
}

export { schema };