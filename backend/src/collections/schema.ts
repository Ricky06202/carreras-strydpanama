import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ============================================
// SONICJS CORE TABLES (necesarias para el funcionamiento)
// ============================================

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  passwordHash: text('password_hash'),
  role: text('role').notNull().default('viewer'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at').notNull().default(Math.floor(Date.now() / 1000)),
  updatedAt: integer('updated_at').notNull().default(Math.floor(Date.now() / 1000)),
});

export const content = sqliteTable('content', {
  id: text('id').primaryKey(),
  collection: text('collection').notNull(),
  data: text('data', { mode: 'json' }).notNull(),
  status: text('status').notNull().default('draft'),
  createdBy: text('created_by'),
  createdAt: integer('created_at').notNull().default(Math.floor(Date.now() / 1000)),
  updatedAt: integer('updated_at').notNull().default(Math.floor(Date.now() / 1000)),
});

// ============================================
// CARRERAS STRYD PANAMA TABLES
// ============================================

export const races = sqliteTable('races', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  date: text('date').notNull(),
  startTime: text('start_time'),
  startTimestamp: integer('start_timestamp'),
  location: text('location'),
  routeGpxUrl: text('route_gpx_url'),
  routeGeoJson: text('route_geojson'),
  imageUrl: text('image_url'),
  technicalInfo: text('technical_info'),
  termsAndConditions: text('terms_and_conditions'),
  price: integer('price').default(0),
  maxParticipants: integer('max_participants'),
  status: text('status').default('upcoming'),
  timerStart: integer('timer_start'),
  timerStop: integer('timer_stop'),
  showTimer: integer('show_timer', { mode: 'boolean' }).default(false),
  showShirtSize: integer('show_shirt_size', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at').default(Math.floor(Date.now() / 1000)),
  updatedAt: integer('updated_at').default(Math.floor(Date.now() / 1000)),
});

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  raceId: text('race_id').notNull(),
  name: text('name').notNull(),
  createdAt: integer('created_at').default(Math.floor(Date.now() / 1000)),
});

export const distances = sqliteTable('distances', {
  id: text('id').primaryKey(),
  raceId: text('race_id').notNull(),
  name: text('name').notNull(),
  createdAt: integer('created_at').default(Math.floor(Date.now() / 1000)),
});

export const participants = sqliteTable('participants', {
  id: text('id').primaryKey(),
  raceId: text('race_id').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  birthDate: text('birth_date'),
  gender: text('gender'),
  categoryId: text('category_id'),
  distanceId: text('distance_id'),
  teamName: text('team_name'),
  teamId: text('team_id'),
  bibNumber: integer('bib_number'),
  size: text('size'),
  cedula: text('cedula'),
  country: text('country'),
  codeId: text('code_id'),
  paymentMethod: text('payment_method'),
  paymentStatus: text('payment_status').default('pending'),
  termsAccepted: integer('terms_accepted', { mode: 'boolean' }).default(false),
  finishTime: integer('finish_time'),
  registeredAt: integer('registered_at').default(Math.floor(Date.now() / 1000)),
});

export const registrationCodes = sqliteTable('registration_codes', {
  id: text('id').primaryKey(),
  code: text('code').unique().notNull(),
  raceId: text('race_id').notNull(),
  used: integer('used', { mode: 'boolean' }).default(false),
  usedByParticipantId: text('used_by_participant_id'),
  createdAt: integer('created_at').default(Math.floor(Date.now() / 1000)),
});

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  participantId: text('participant_id').notNull(),
  yappyOrderId: text('yappy_order_id'),
  amount: integer('amount').notNull(),
  status: text('status').default('pending'),
  createdAt: integer('created_at').default(Math.floor(Date.now() / 1000)),
  updatedAt: integer('updated_at').default(Math.floor(Date.now() / 1000)),
});

export const runningTeams = sqliteTable('running_teams', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  isApproved: integer('is_approved').notNull().default(0),
});

// ============================================
// RELATIONS
// ============================================

export const racesRelations = relations(races, ({ many }) => ({
  categories: many(categories),
  distances: many(distances),
  participants: many(participants),
  registrationCodes: many(registrationCodes),
}));

export const categoriesRelations = relations(categories, ({ one }) => ({
  race: one(races, {
    fields: [categories.raceId],
    references: [races.id],
  }),
}));

export const distancesRelations = relations(distances, ({ one }) => ({
  race: one(races, {
    fields: [distances.raceId],
    references: [races.id],
  }),
}));

export const participantsRelations = relations(participants, ({ one }) => ({
  race: one(races, {
    fields: [participants.raceId],
    references: [races.id],
  }),
  category: one(categories, {
    fields: [participants.categoryId],
    references: [categories.id],
  }),
  distance: one(distances, {
    fields: [participants.distanceId],
    references: [distances.id],
  }),
}));

export const registrationCodesRelations = relations(registrationCodes, ({ one }) => ({
  race: one(races, {
    fields: [registrationCodes.raceId],
    references: [races.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  participant: one(participants, {
    fields: [transactions.participantId],
    references: [participants.id],
  }),
}));

// ============================================
// EXPORT TYPES
// ============================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Content = typeof content.$inferSelect;
export type NewContent = typeof content.$inferInsert;
export type Race = typeof races.$inferSelect;
export type NewRace = typeof races.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Distance = typeof distances.$inferSelect;
export type NewDistance = typeof distances.$inferInsert;
export type Participant = typeof participants.$inferSelect;
export type NewParticipant = typeof participants.$inferInsert;
export type RegistrationCode = typeof registrationCodes.$inferSelect;
export type NewRegistrationCode = typeof registrationCodes.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type RunningTeam = typeof runningTeams.$inferSelect;
export type NewRunningTeam = typeof runningTeams.$inferInsert;
