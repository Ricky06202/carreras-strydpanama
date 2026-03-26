import type { APIRoute } from 'astro';
import { drizzle } from 'drizzle-orm/d1';
import { runningTeams, participants } from '../../../../lib/db/schema';
import { eq } from 'drizzle-orm';
import { env } from 'cloudflare:workers';

export const PUT: APIRoute = async ({ request, params }) => {
  try {
    const id = params.id;
    if (!id) throw new Error("ID requerido");
    
    const rawDb = env.DB;
    if (!rawDb) throw new Error("No DB bind found");
    const db = drizzle(rawDb);
    
    const data = await request.json();

    // Obtenemos el equipo actual para ver si cambió el nombre
    const oldTeam = await db.select().from(runningTeams).where(eq(runningTeams.id, id)).limit(1).all();
    const oldName = oldTeam[0]?.name;

    await db.update(runningTeams).set(data).where(eq(runningTeams.id, id));

    // Si el nombre fue modificado y corregido ortográficamente por el Admin,
    // propagamos ese cambio a todos los participantes inscritos bajo ese equipo defectuoso.
    if (data.name && oldName && data.name !== oldName) {
        await db.update(participants).set({ teamName: data.name }).where(eq(participants.teamName, oldName));
    }
    
    return new Response(JSON.stringify({ success: true }), { 
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

export const DELETE: APIRoute = async ({ params }) => {
  try {
    const id = params.id;
    if (!id) throw new Error("ID requerido");

    const rawDb = env.DB;
    if (!rawDb) throw new Error("No DB bind found");
    const db = drizzle(rawDb);

    await db.delete(runningTeams).where(eq(runningTeams.id, id));
    
    return new Response(JSON.stringify({ success: true }), { 
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
