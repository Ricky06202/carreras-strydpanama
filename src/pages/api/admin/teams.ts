import type { APIRoute } from 'astro';
import { drizzle } from 'drizzle-orm/d1';
import { runningTeams } from '../../../lib/db/schema';
import { sql } from 'drizzle-orm';

export const GET: APIRoute = async ({ locals }) => {
  try {
    const rawDb = (locals as any).runtime?.env?.DB;
    if (!rawDb) throw new Error("No DB bind found");
    const db = drizzle(rawDb);

    // List all teams, pending ones first, then alphabetically
    const teams = await db.select().from(runningTeams).orderBy(sql`${runningTeams.isApproved} ASC, ${runningTeams.name} ASC`).all();
    
    return new Response(JSON.stringify({ teams }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
     });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
     });
  }
};
