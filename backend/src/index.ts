import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from './collections/schema';

// Definir el entorno de Cloudflare Workers
export interface Env {
  DB: D1Database;
  MEDIA_BUCKET: R2Bucket;
  KV: KVNamespace;
}

// Crear la aplicación Hono
const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: ['http://localhost:4321', 'https://carreras-strydpanama.pages.dev'],
  credentials: true,
}));

// Función para obtener la base de datos
function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

// ============================================
// API PÚBLICA (sin autenticación)
// ============================================

// Obtener carreras públicas (status: accepting)
app.get('/api/races', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const races = await db.select().from(schema.races);
    return c.json({ races });
  } catch (error) {
    console.error('Error fetching races:', error);
    return c.json({ error: 'Error al obtener carreras' }, 500);
  }
});

// Obtener carrera por ID
app.get('/api/race/:id', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const id = c.req.param('id');
    const race = await db.select().from(schema.races).where(eq(schema.races.id, id));
    
    if (!race.length) {
      return c.json({ error: 'Carrera no encontrada' }, 404);
    }
    
    // Obtener categorías y distancias
    const categories = await db.select().from(schema.categories).where(eq(schema.categories.raceId, id));
    const distances = await db.select().from(schema.distances).where(eq(schema.distances.raceId, id));
    
    return c.json({ 
      race: race[0],
      categories,
      distances
    });
  } catch (error) {
    console.error('Error fetching race:', error);
    return c.json({ error: 'Error al obtener carrera' }, 500);
  }
});

// Registrar participante
app.post('/api/register', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const body = await c.req.json();
    
    const { 
      firstName, lastName, email, phone, birthDate, gender, 
      categoryId, distanceId, teamName, size, paymentMethod, 
      code, raceId, termsAccepted 
    } = body;
    
    // Verificar que la carrera existe y está accepting
    const race = await db.select().from(schema.races).where(eq(schema.races.id, raceId));
    
    if (!race.length) {
      return c.json({ error: 'Carrera no encontrada' }, 404);
    }
    
    if (race[0].status !== 'accepting') {
      return c.json({ error: 'Las inscripciones no están abiertas' }, 400);
    }
    
    if (!termsAccepted) {
      return c.json({ error: 'Debes aceptar los términos y condiciones' }, 400);
    }
    
    // Crear participante
    const participantId = crypto.randomUUID();
    const participant = await db.insert(schema.participants).values({
      id: participantId,
      raceId,
      firstName,
      lastName,
      email,
      phone,
      birthDate,
      gender,
      categoryId,
      distanceId,
      teamName,
      size,
      paymentMethod,
      paymentStatus: 'pending',
      termsAccepted: true,
      registeredAt: Math.floor(Date.now() / 1000),
    }).returning();
    
    return c.json({ 
      success: true, 
      participant: participant[0],
      message: 'Inscripción completada'
    });
  } catch (error) {
    console.error('Error registering participant:', error);
    return c.json({ error: 'Error al registrar participante' }, 500);
  }
});

// Obtener categorías por carrera
app.get('/api/categories/:raceId', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const raceId = c.req.param('raceId');
    const categories = await db.select().from(schema.categories).where(eq(schema.categories.raceId, raceId));
    return c.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return c.json({ error: 'Error al obtener categorías' }, 500);
  }
});

// Obtener distancias por carrera
app.get('/api/distances/:raceId', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const raceId = c.req.param('raceId');
    const distances = await db.select().from(schema.distances).where(eq(schema.distances.raceId, raceId));
    return c.json({ distances });
  } catch (error) {
    console.error('Error fetching distances:', error);
    return c.json({ error: 'Error al obtener distancias' }, 500);
  }
});

// Validar código de registro
app.post('/api/validate-code', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const { code, raceId } = await c.req.json();
    
    const registrationCode = await db.select().from(schema.registrationCodes)
      .where(eq(schema.registrationCodes.code, code));
    
    if (!registrationCode.length || registrationCode[0].used) {
      return c.json({ valid: false, message: 'Código no válido o ya usado' }, 400);
    }
    
    if (registrationCode[0].raceId && registrationCode[0].raceId !== raceId) {
      return c.json({ valid: false, message: 'Código no válido para esta carrera' }, 400);
    }
    
    return c.json({ valid: true, code: registrationCode[0] });
  } catch (error) {
    console.error('Error validating code:', error);
    return c.json({ error: 'Error al validar código' }, 500);
  }
});

// Obtener equipos aprobados
app.get('/api/teams', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const teams = await db.select().from(schema.runningTeams);
    return c.json({ teams });
  } catch (error) {
    console.error('Error fetching teams:', error);
    return c.json({ error: 'Error al obtener equipos' }, 500);
  }
});

// ============================================
// RUTAS DE ADMIN (protegidas por Cloudflare Zero Trust)
// ============================================

// Dashboard de admin
app.get('/admin', async (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Admin - Carreras STRYD Panama</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: #1a1a2e; color: white; }
        h1 { color: #00d4ff; }
        a { color: #00d4ff; }
      </style>
    </head>
    <body>
      <h1>Panel de Administración - Carreras STRYD Panama</h1>
      <p>Este es el panel de administración protegido por Cloudflare Zero Trust.</p>
      <h2>APIs Disponibles:</h2>
      <ul>
        <li><a href="/api/races">GET /api/races</a> - Carreras públicas</li>
        <li><a href="/api/admin/races">GET /api/admin/races</a> - Todas las carreras (admin)</li>
        <li>POST /api/admin/races - Crear carrera</li>
        <li>PUT /api/admin/races/:id - Actualizar carrera</li>
        <li>DELETE /api/admin/races/:id - Eliminar carrera</li>
      </ul>
      <h2>Health Check:</h2>
      <p><a href="/health">GET /health</a></p>
    </body>
    </html>
  `);
});

// API Admin - Obtener todas las carreras
app.get('/api/admin/races', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const races = await db.select().from(schema.races);
    return c.json({ races });
  } catch (error) {
    console.error('Error fetching admin races:', error);
    return c.json({ error: 'Error al obtener carreras' }, 500);
  }
});

// API Admin - Crear carrera
app.post('/api/admin/races', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const body = await c.req.json();
    
    const raceId = crypto.randomUUID();
    const race = await db.insert(schema.races).values({
      id: raceId,
      ...body,
      createdAt: Math.floor(Date.now() / 1000),
      updatedAt: Math.floor(Date.now() / 1000),
    }).returning();
    
    return c.json({ success: true, race: race[0] });
  } catch (error) {
    console.error('Error creating race:', error);
    return c.json({ error: 'Error al crear carrera' }, 500);
  }
});

// API Admin - Actualizar carrera
app.put('/api/admin/races/:id', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const id = c.req.param('id');
    const body = await c.req.json();
    
    const race = await db.update(schema.races)
      .set({ ...body, updatedAt: Math.floor(Date.now() / 1000) })
      .where(eq(schema.races.id, id))
      .returning();
    
    if (!race.length) {
      return c.json({ error: 'Carrera no encontrada' }, 404);
    }
    
    return c.json({ success: true, race: race[0] });
  } catch (error) {
    console.error('Error updating race:', error);
    return c.json({ error: 'Error al actualizar carrera' }, 500);
  }
});

// API Admin - Eliminar carrera
app.delete('/api/admin/races/:id', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const id = c.req.param('id');
    
    await db.delete(schema.races).where(eq(schema.races.id, id));
    
    return c.json({ success: true, message: 'Carrera eliminada' });
  } catch (error) {
    console.error('Error deleting race:', error);
    return c.json({ error: 'Error al eliminar carrera' }, 500);
  }
});

// Health check
app.get('/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Carreras STRYD Panama API'
  });
});

// Exportar el worker
export default app;
