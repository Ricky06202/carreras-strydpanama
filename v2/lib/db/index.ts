import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb(d1: typeof env.DB = env.DB) {
  return drizzle(d1, { schema });
}

export { schema };

export type Db = ReturnType<typeof getDb>;
