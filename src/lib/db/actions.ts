import { drizzle } from 'drizzle-orm/d1';
import { eq, desc, and, sql } from 'drizzle-orm';
import * as schema from './schema';

export type Database = ReturnType<typeof drizzle>;

export async function getRaces(db: Database) {
  return await db.select().from(schema.races).orderBy(desc(schema.races.date));
}

export async function getRaceById(db: Database, id: string) {
  const result = await db.select().from(schema.races).where(eq(schema.races.id, id)).limit(1);
  return result[0] || null;
}

export async function getActiveRaces(db: Database) {
  return await db.select().from(schema.races).where(eq(schema.races.status, 'active')).orderBy(desc(schema.races.date));
}

export async function createRace(db: Database, race: schema.NewRace) {
  return await db.insert(schema.races).values(race).returning();
}

export async function updateRace(db: Database, id: string, data: Partial<schema.Race>) {
  return await db.update(schema.races).set({ ...data, updatedAt: Math.floor(Date.now() / 1000) }).where(eq(schema.races.id, id)).returning();
}

export async function deleteRace(db: Database, id: string) {
  return await db.delete(schema.races).where(eq(schema.races.id, id));
}

export async function getParticipantsByRace(db: Database, raceId: string) {
  return await db.select().from(schema.participants).where(eq(schema.participants.raceId, raceId)).orderBy(desc(schema.participants.registeredAt));
}

export async function getParticipantById(db: Database, id: string) {
  const result = await db.select().from(schema.participants).where(eq(schema.participants.id, id)).limit(1);
  return result[0] || null;
}

export async function createParticipant(db: Database, participant: schema.NewParticipant) {
  return await db.insert(schema.participants).values(participant).returning();
}

export async function updateParticipant(db: Database, id: string, data: Partial<schema.Participant>) {
  return await db.update(schema.participants).set(data).where(eq(schema.participants.id, id)).returning();
}

export async function getRegistrationCode(db: Database, code: string) {
  const result = await db.select().from(schema.registrationCodes).where(eq(schema.registrationCodes.code, code)).limit(1);
  return result[0] || null;
}

export async function getCodesByRace(db: Database, raceId: string) {
  return await db.select().from(schema.registrationCodes).where(eq(schema.registrationCodes.raceId, raceId));
}

export async function createRegistrationCode(db: Database, code: schema.NewRegistrationCode) {
  return await db.insert(schema.registrationCodes).values(code).returning();
}

export async function useRegistrationCode(db: Database, codeId: string, participantId: string) {
  return await db.update(schema.registrationCodes).set({ used: 1, usedByParticipantId: participantId }).where(eq(schema.registrationCodes.id, codeId)).returning();
}

export async function createTransaction(db: Database, transaction: schema.NewTransaction) {
  return await db.insert(schema.transactions).values(transaction).returning();
}

export async function getTransactionById(db: Database, id: string) {
  const result = await db.select().from(schema.transactions).where(eq(schema.transactions.id, id)).limit(1);
  return result[0] || null;
}

export async function updateTransaction(db: Database, id: string, data: Partial<schema.Transaction>) {
  return await db.update(schema.transactions).set({ ...data, updatedAt: Math.floor(Date.now() / 1000) }).where(eq(schema.transactions.id, id)).returning();
}

export async function getRaceStats(db: Database, raceId: string) {
  const total = await db.select({ count: sql<number>`count(*)` }).from(schema.participants).where(eq(schema.participants.raceId, raceId));
  const paid = await db.select({ count: sql<number>`count(*)` }).from(schema.participants).where(and(eq(schema.participants.raceId, raceId), eq(schema.participants.paymentStatus, 'paid')));
  return { total: total[0]?.count || 0, paid: paid[0]?.count || 0 };
}