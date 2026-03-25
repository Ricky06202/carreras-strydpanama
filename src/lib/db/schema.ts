import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

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
  teamPosition: integer('team_position'),
  size: text('size'),
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
  used: integer('default', { mode: 'boolean' }).default(false),
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