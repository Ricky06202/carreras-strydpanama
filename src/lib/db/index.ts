import { drizzle } from 'drizzle-orm/d1';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from './schema';

export type Database = DrizzleD1Database<typeof schema>;

let db: Database | null = null;

export function getDb(env: unknown): Database {
  if (!db && env) {
    db = drizzle(env as any, { schema });
  }
  return db!;
}

export { schema };