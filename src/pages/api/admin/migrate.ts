import type { APIRoute } from 'astro';
import { drizzle } from 'drizzle-orm/d1';
import { sql } from 'drizzle-orm';
import { env } from 'cloudflare:workers';

const predefinedTeams = [
  "Academia Internacional de Boquete", "Academia Internacional de David", "ACHILLES PANAMA", "ADIDAS RUNNERS", "ADN RUNNERS", "AGUADULCE RUNNERS", "AGUAS CRISTALINAS", "ALCANCE VICTORIA", "ALFREDO MINUTO CANESSA ESC.", "ALGARROBOS TEAM", "ALLE PROFIS", "ALOE OKF", "ALTO RENDIMIENTO", "ANEP TEAM", "ATLETISMO EXTREMO TEAM CR", "BANDA PALMIRA RUNNERS", "BANDIT RUNNERS", "BERARD TEAM", "BIG FAMILY RUNNING TEAM", "BOANERGES TEAM", "BOQUETE RUN ON FIRE", "BOSS RUNNERS", "BUGABA RUNNERS", "C-13 CHORRERA", "C11 RUNNING CLUB", "C6 RUNNERS", "C7 RUNNERS", "C9 RUNNERS TEAM", "CANALEROS RUNNING TEAM", "CENTRALES NESTLÉ", "COLON RUNNERS", "COMORSA RUNNERS TEAM", "COSTA DEL ESTE RUNNING TEAM", "CUTARRA RUNNERS", "DARIEN RUNNERS", "DECATHLON TEAM", "DESTINY SPORT", "DGFPA TEAM", "EMPIRE RUNNING TEAM", "ETSS RUNNING TEAM", "ETT ELITE TRAINING TEAM", "EXPRESSO RUNNERS", "FIERAS RUNNING TEAM", "FORZA SPORTIVA", "FULL RUNNERS TEAM", "GT RUNNERS", "HAPPY TRAINER RUNNING", "HERBALIFE TEAM", "JAMMIN RUNNERS", "JUANETEROS", "K42PTY", "KINESIS TEAM", "LIFEFIT TEAM", "LS RUNNING TEAM", "MALEK 507 TEAM", "MANDA TEAM", "MARATHON PACE", "MARRIOTT", "METROMALL TEAM", "NESTLÉ CENTRALES FABRICA DE NATA", "NESTLÉ OCCIDENTE", "NESTLÉ PANAMÁ (PSur, La Loma, Hub)", "NEWTON RUNNING TEAM", "NYEUPE TIMU", "OCU RUNNERS TEAM", "P42 TEAM", "PAISANOS RUNNERS", "PANAMA ROCK SESSION", "PANAMA RUNNERS", "PENONOME RUNNING CLUB", "PEREA RUNNING TEAM", "PIES PLANOS TEAM RUNNERS", "POLARIS TEAM", "PRO TEAM TITANS", "PROFIT GYM", "PSA TEAM", "QUISQUILLOSOS TEAM", "R.S GYM RUNNERS", "RED BULL", "RICH COACH PTY TEAM", "ROAD RUNNERS PENONOME", "RON RUNNERS", "RUN 4 LIFE CHIRIQUI", "RUN FIT 4 LIFE RD", "RUN O CLOCK", "RUNNERS & FRIENDS", "RUNNING LIFE TEAM", "RUNNING PROJECT", "SAMSUNG TEAM", "SANSON COSTA RICA", "SEMPRURUNNERS", "SENAFRONT", "SEVENTH DAY RUNNERS", "SIMON TEAM", "SMART RUN", "SORTOVA ATHLETIC TEAM", "SPARTANOS RUNNERS", "STRYD PANAMA", "STV TRI TEAM", "SUPER TEAM PANAMA", "TAMBOR TEAM", "TITANS RUNNING TEAM", "TRAIL AND FUN PTY", "TRIFRIENDS", "TRILLOSOS VERAGUAS TEAM", "TRIZEN", "TTC THE TRAINING CLUB", "UDELAS", "ULACIT", "UNACHI", "UNIVERSIDAD COLUMBUS", "UNIVERSIDAD DE PANAMÁ", "UNIVERSIDAD DE PANAMÁ (FAC. AGRONOMÍA)", "UNIVERSIDAD ISAE", "UNIVERSIDAD LATINA", "UNIVERSIDAD TEC. OTEIMA", "UNIVERSIDAD TECNOLÓGICA (UTP)", "USMA", "VERAGUAS RUNNERS", "VIKINGS RUNNERS TEAM", "VIKINGS TRI FORCE", "Vo2 MAX TEAM"
];

export const GET: APIRoute = async ({ request }) => {
  let logs: string[] = [];

  try {
    const rawDb = env.DB;
    if (!rawDb) throw new Error("No DB bind found via cloudflare:workers env");
    const db = drizzle(rawDb);
    
    // Step 1: Add new columns if missing
    try {
      await db.run(sql`ALTER TABLE participants ADD COLUMN cedula TEXT`);
      logs.push("Added cedula column to participants");
    } catch (e: any) {
      if (e.message?.includes('duplicate column name') || String(e).includes('duplicate column name')) {
        logs.push("Column cedula already exists");
      } else {
        logs.push(`Error adding cedula: ${e}`);
      }
    }

    try {
      await db.run(sql`ALTER TABLE participants ADD COLUMN country TEXT`);
      logs.push("Added country column to participants");
    } catch (e: any) {
      if (e.message?.includes('duplicate column name') || String(e).includes('duplicate column name')) {
        logs.push("Column country already exists");
      } else {
        logs.push(`Error adding country: ${e}`);
      }
    }

    // Step 2: Create running_teams table
    try {
      await db.run(sql`
        CREATE TABLE IF NOT EXISTS running_teams (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          is_approved INTEGER NOT NULL DEFAULT 0
        )
      `);
      logs.push("Ensured running_teams table exists");

      // Seed predefined teams
      let seededCount = 0;
      for (const team of predefinedTeams) {
        try {
          await db.run(sql`
            INSERT INTO running_teams (id, name, is_approved) 
            VALUES (${crypto.randomUUID()}, ${team}, 1)
            ON CONFLICT(name) DO UPDATE SET is_approved = 1
          `);
          seededCount++;
        } catch(subErr) {
          // Ignore unique constraints individually
        }
      }
      logs.push(`Seeded ${seededCount} predefined teams into database.`);

      // Step 3: Map any existing participants.teamName strings tightly to running_teams if missing, unapproved
      try {
        await db.run(sql`
          INSERT INTO running_teams (id, name, is_approved)
          SELECT lower(hex(randomblob(16))), teamName, 0
          FROM participants
          WHERE teamName IS NOT NULL AND teamName != '' AND teamName NOT IN (SELECT name FROM running_teams)
          GROUP BY teamName
        `);
        logs.push(`Imported existing user-created teams to pending queue.`);
      } catch(err) {
        logs.push(`Could not automatically import historic participant teams: ${err}`);
      }

    } catch (e) {
      logs.push(`Failed to construct or seed running_teams table: ${e}`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Migración finalizada. Revisa los logs para mayor información.",
      logs 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message, logs }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
