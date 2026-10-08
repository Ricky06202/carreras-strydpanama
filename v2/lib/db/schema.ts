import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const pkId = () => ({ id: text("id").primaryKey() });
const timestamps = {
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
};

export const races = sqliteTable(
  "races",
  {
    ...pkId(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    description: text("description"),
    date: text("date").notNull(),
    startTime: text("start_time"),
    location: text("location"),
    imageUrl: text("image_url"),
    routeGpxUrl: text("route_gpx_url"),
    routeEmbedCode: text("route_embed_code"),
    technicalInfo: text("technical_info"),
    termsAndConditions: text("terms_and_conditions"),
    price: real("price").notNull().default(0),
    platformFee: real("platform_fee").notNull().default(0),
    legacyPrice: real("legacy_price"),
    legacyCutoff: text("legacy_cutoff"),
    maxParticipants: integer("max_participants"),
    status: text("status", { enum: ["upcoming", "accepting", "closed", "active", "finished"] })
      .notNull()
      .default("upcoming"),
    showTimer: integer("show_timer", { mode: "boolean" }).notNull().default(true),
    startingBib: integer("starting_bib"),
    showShirtSize: integer("show_shirt_size", { mode: "boolean" }).notNull().default(false),
    timerStartMs: integer("timer_start_ms"),
    timerStopMs: integer("timer_stop_ms"),
    timer2StartMs: integer("timer2_start_ms"),
    timer2StopMs: integer("timer2_stop_ms"),
    teamEnabled: integer("team_enabled", { mode: "boolean" }).notNull().default(false),
    padrinoEnabled: integer("padrino_enabled", { mode: "boolean" }).notNull().default(false),
    certificateLogoUrl: text("certificate_logo_url"),
    ...timestamps,
  },
  (t) => [index("races_status_idx").on(t.status), index("races_date_idx").on(t.date)],
);

export const raceDistances = sqliteTable(
  "race_distances",
  {
    ...pkId(),
    raceId: text("race_id")
      .notNull()
      .references(() => races.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    kilometers: real("kilometers").notNull(),
    price: real("price"),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("race_distances_race_idx").on(t.raceId)],
);

export const raceCategories = sqliteTable(
  "race_categories",
  {
    ...pkId(),
    raceId: text("race_id")
      .notNull()
      .references(() => races.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    minAge: integer("min_age").notNull(),
    maxAge: integer("max_age").notNull(),
    gender: text("gender", { enum: ["masculino", "femenino", "ambos"] }).notNull().default("ambos"),
  },
  (t) => [index("race_categories_race_idx").on(t.raceId)],
);

export const participantTypes = sqliteTable(
  "participant_types",
  {
    ...pkId(),
    raceId: text("race_id")
      .notNull()
      .references(() => races.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    title: text("title").notNull(),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    categoryKeyword: text("category_keyword"),
    distanceKeyword: text("distance_keyword"),
  },
  (t) => [index("participant_types_race_idx").on(t.raceId)],
);

export const runners = sqliteTable(
  "runners",
  {
    ...pkId(),
    cedula: text("cedula").notNull().unique(),
    email: text("email").notNull().unique(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    phone: text("phone"),
    birthDate: text("birth_date"),
    gender: text("gender", { enum: ["masculino", "femenino", "otro"] }),
    country: text("country").default("Panamá"),
    photoUrl: text("photo_url"),
    bannerUrl: text("banner_url"),
    bio: text("bio"),
    instagram: text("instagram"),
    strava: text("strava"),
    facebook: text("facebook"),
    tiktok: text("tiktok"),
    personalRecords: text("personal_records"),
    favoriteRaces: text("favorite_races"),
    plannedRaces: text("planned_races"),
    gear: text("gear"),
    totalRaces: integer("total_races").notNull().default(0),
    publicProfile: integer("public_profile", { mode: "boolean" }).notNull().default(true),
    publicFields: text("public_fields"),
    passwordHash: text("password_hash"),
    passwordSalt: text("password_salt"),
    sessionToken: text("session_token"),
    sessionExpiry: text("session_expiry"),
    ...timestamps,
  },
  (t) => [index("runners_session_idx").on(t.sessionToken)],
);

export const teams = sqliteTable(
  "teams",
  {
    ...pkId(),
    name: text("name").notNull().unique(),
    isApproved: integer("is_approved", { mode: "boolean" }).notNull().default(false),
    ...timestamps,
  },
  (t) => [index("teams_approved_idx").on(t.isApproved)],
);

export const registrationCodes = sqliteTable(
  "registration_codes",
  {
    ...pkId(),
    raceId: text("race_id")
      .notNull()
      .references(() => races.id, { onDelete: "cascade" }),
    code: text("code").notNull().unique(),
    vendor: text("vendor"),
    batchId: text("batch_id"),
    status: text("status", { enum: ["generated", "sold", "redeemed"] }).notNull().default("generated"),
    allowedType: text("allowed_type", { enum: ["all", "general", "estudiante", "team"] })
      .notNull()
      .default("all"),
    redeemedByCedula: text("redeemed_by_cedula"),
    usedAt: text("used_at"),
    ...timestamps,
  },
  (t) => [index("codes_race_status_idx").on(t.raceId, t.status)],
);

export const registrations = sqliteTable(
  "registrations",
  {
    ...pkId(),
    raceId: text("race_id")
      .notNull()
      .references(() => races.id, { onDelete: "cascade" }),
    runnerId: text("runner_id").references(() => runners.id, { onDelete: "set null" }),
    confirmationCode: text("confirmation_code").notNull().unique(),
    title: text("title").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    cedula: text("cedula"),
    birthDate: text("birth_date"),
    gender: text("gender"),
    country: text("country"),
    categoryId: text("category_id").references(() => raceCategories.id, { onDelete: "set null" }),
    distanceId: text("distance_id").references(() => raceDistances.id, { onDelete: "set null" }),
    participantTypeId: text("participant_type_id").references(() => participantTypes.id, {
      onDelete: "set null",
    }),
    teamId: text("team_id").references(() => teams.id, { onDelete: "set null" }),
    teamName: text("team_name"),
    bibNumber: integer("bib_number"),
    shirtSize: text("shirt_size"),
    status: text("status", { enum: ["preinscrito", "inscrito", "anulado"] })
      .notNull()
      .default("preinscrito"),
    paymentStatus: text("payment_status", { enum: ["pendiente", "pagado", "reembolsado", "exento" ] })
      .notNull()
      .default("pendiente"),
    amountPaid: real("amount_paid").notNull().default(0),
    discountCode: text("discount_code"),
    finishTimeSec: integer("finish_time_sec"),
    checkpointTimeSec: integer("checkpoint_time_sec"),
    timingSource: text("timing_source"),
    timingConfidence: real("timing_confidence"),
    isPadrino: integer("is_padrino", { mode: "boolean" }).notNull().default(false),
    donatedTickets: integer("donated_tickets").notNull().default(0),
    shippingAddress: text("shipping_address"),
    studentIdUrl: text("student_id_url"),
    matriculaUrl: text("matricula_url"),
    photoUrl: text("photo_url"),
    // Consentimiento trazable (Ley 81-2019): qué texto exacto aceptó el corredor y cuándo.
    termsVersion: text("terms_version"),
    termsTextHash: text("terms_text_hash"),
    termsAcceptedAt: text("terms_accepted_at"),
    privacyAcceptedAt: text("privacy_accepted_at"),
    guardianDeclaredAt: text("guardian_declared_at"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("registrations_race_cedula_idx").on(t.raceId, t.cedula),
    index("registrations_race_status_idx").on(t.raceId, t.status),
    index("registrations_runner_idx").on(t.runnerId),
    index("registrations_bib_idx").on(t.raceId, t.bibNumber),
  ],
);

export const payments = sqliteTable(
  "payments",
  {
    ...pkId(),
    registrationId: text("registration_id")
      .notNull()
      .references(() => registrations.id, { onDelete: "cascade" }),
    amount: real("amount").notNull(),
    currency: text("currency").notNull().default("USD"),
    status: text("status", { enum: ["pending", "approved", "declined", "refunded"] })
      .notNull()
      .default("pending"),
    provider: text("provider").notNull().default("yappy"),
    orderId: text("order_id").notNull().unique(),
    receiptUrl: text("receipt_url"),
    // Token de un solo uso entregado al comprador al crear la orden Yappy:
    // /api/inscripciones/confirm exige poseerlo, así el orderId solo no puede marcar "pagado".
    confirmTokenHash: text("confirm_token_hash"),
    payload: text("payload"),
    ...timestamps,
  },
  (t) => [index("payments_registration_idx").on(t.registrationId)],
);

export const timingEvents = sqliteTable(
  "timing_events",
  {
    ...pkId(),
    raceId: text("race_id")
      .notNull()
      .references(() => races.id, { onDelete: "cascade" }),
    registrationId: text("registration_id").references(() => registrations.id, {
      onDelete: "cascade",
    }),
    bibNumber: integer("bib_number"),
    checkpoint: text("checkpoint").notNull().default("finish"),
    elapsedSec: integer("elapsed_sec").notNull(),
    source: text("source", { enum: ["manual", "camera", "timer"] }).notNull().default("manual"),
    recordedAtMs: integer("recorded_at_ms").notNull(),
    ...timestamps,
  },
  (t) => [index("timing_race_bib_idx").on(t.raceId, t.bibNumber, t.checkpoint)],
);

export const results = sqliteTable(
  "results",
  {
    ...pkId(),
    raceId: text("race_id")
      .notNull()
      .references(() => races.id, { onDelete: "cascade" }),
    registrationId: text("registration_id").notNull().unique()
      .references(() => registrations.id, { onDelete: "cascade" }),
    finishTimeSec: integer("finish_time_sec").notNull(),
    categoryPosition: integer("category_position"),
    overallPosition: integer("overall_position"),
    ...timestamps,
  },
  (t) => [index("results_race_pos_idx").on(t.raceId, t.overallPosition)],
);

export const raffleWinners = sqliteTable(
  "raffle_winners",
  {
    ...pkId(),
    raceId: text("race_id")
      .notNull()
      .references(() => races.id, { onDelete: "cascade" }),
    registrationId: text("registration_id")
      .notNull()
      .references(() => registrations.id, { onDelete: "cascade" }),
    prize: text("prize"),
    ...timestamps,
  },
  (t) => [index("raffle_race_idx").on(t.raceId)],
);

export const sponsors = sqliteTable(
  "sponsors",
  {
    ...pkId(),
    name: text("name").notNull(),
    logoUrl: text("logo_url").notNull(),
    url: text("url"),
    level: text("level", { enum: ["gold", "silver", "bronze"] }).notNull().default("bronze"),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("sponsors_level_idx").on(t.level, t.sortOrder)],
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export type Race = typeof races.$inferSelect;
export type Runner = typeof runners.$inferSelect;
export type Registration = typeof registrations.$inferSelect;
export type RegistrationCode = typeof registrationCodes.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type Result = typeof results.$inferSelect;
export type Sponsor = typeof sponsors.$inferSelect;
