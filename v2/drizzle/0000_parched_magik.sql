CREATE TABLE `participant_types` (
	`id` text PRIMARY KEY NOT NULL,
	`race_id` text NOT NULL,
	`key` text NOT NULL,
	`title` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`category_keyword` text,
	`distance_keyword` text,
	FOREIGN KEY (`race_id`) REFERENCES `races`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `participant_types_race_idx` ON `participant_types` (`race_id`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`registration_id` text NOT NULL,
	`amount` real NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`provider` text DEFAULT 'yappy' NOT NULL,
	`order_id` text NOT NULL,
	`receipt_url` text,
	`payload` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payments_order_id_unique` ON `payments` (`order_id`);--> statement-breakpoint
CREATE INDEX `payments_registration_idx` ON `payments` (`registration_id`);--> statement-breakpoint
CREATE TABLE `race_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`race_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`min_age` integer NOT NULL,
	`max_age` integer NOT NULL,
	`gender` text DEFAULT 'ambos' NOT NULL,
	FOREIGN KEY (`race_id`) REFERENCES `races`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `race_categories_race_idx` ON `race_categories` (`race_id`);--> statement-breakpoint
CREATE TABLE `race_distances` (
	`id` text PRIMARY KEY NOT NULL,
	`race_id` text NOT NULL,
	`title` text NOT NULL,
	`kilometers` real NOT NULL,
	`price` real,
	`description` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`race_id`) REFERENCES `races`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `race_distances_race_idx` ON `race_distances` (`race_id`);--> statement-breakpoint
CREATE TABLE `races` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`date` text NOT NULL,
	`start_time` text,
	`location` text,
	`image_url` text,
	`route_gpx_url` text,
	`route_embed_code` text,
	`technical_info` text,
	`terms_and_conditions` text,
	`price` real DEFAULT 0 NOT NULL,
	`platform_fee` real DEFAULT 0 NOT NULL,
	`legacy_price` real,
	`legacy_cutoff` text,
	`max_participants` integer,
	`status` text DEFAULT 'upcoming' NOT NULL,
	`show_timer` integer DEFAULT true NOT NULL,
	`starting_bib` integer,
	`show_shirt_size` integer DEFAULT false NOT NULL,
	`timer_start_ms` integer,
	`timer_stop_ms` integer,
	`timer2_start_ms` integer,
	`timer2_stop_ms` integer,
	`team_enabled` integer DEFAULT false NOT NULL,
	`padrino_enabled` integer DEFAULT false NOT NULL,
	`certificate_logo_url` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `races_slug_unique` ON `races` (`slug`);--> statement-breakpoint
CREATE INDEX `races_status_idx` ON `races` (`status`);--> statement-breakpoint
CREATE INDEX `races_date_idx` ON `races` (`date`);--> statement-breakpoint
CREATE TABLE `raffle_winners` (
	`id` text PRIMARY KEY NOT NULL,
	`race_id` text NOT NULL,
	`registration_id` text NOT NULL,
	`prize` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`race_id`) REFERENCES `races`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `raffle_race_idx` ON `raffle_winners` (`race_id`);--> statement-breakpoint
CREATE TABLE `registration_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`race_id` text NOT NULL,
	`code` text NOT NULL,
	`vendor` text,
	`batch_id` text,
	`status` text DEFAULT 'generated' NOT NULL,
	`allowed_type` text DEFAULT 'all' NOT NULL,
	`redeemed_by_cedula` text,
	`used_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`race_id`) REFERENCES `races`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `registration_codes_code_unique` ON `registration_codes` (`code`);--> statement-breakpoint
CREATE INDEX `codes_race_status_idx` ON `registration_codes` (`race_id`,`status`);--> statement-breakpoint
CREATE TABLE `registrations` (
	`id` text PRIMARY KEY NOT NULL,
	`race_id` text NOT NULL,
	`runner_id` text,
	`confirmation_code` text NOT NULL,
	`title` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`cedula` text NOT NULL,
	`birth_date` text,
	`gender` text,
	`country` text,
	`category_id` text,
	`distance_id` text,
	`participant_type_id` text,
	`team_id` text,
	`bib_number` integer,
	`shirt_size` text,
	`status` text DEFAULT 'preinscrito' NOT NULL,
	`payment_status` text DEFAULT 'pendiente' NOT NULL,
	`amount_paid` real DEFAULT 0 NOT NULL,
	`discount_code` text,
	`finish_time_sec` integer,
	`checkpoint_time_sec` integer,
	`timing_source` text,
	`timing_confidence` real,
	`is_padrino` integer DEFAULT false NOT NULL,
	`donated_tickets` integer DEFAULT 0 NOT NULL,
	`shipping_address` text,
	`student_id_url` text,
	`matricula_url` text,
	`photo_url` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`race_id`) REFERENCES `races`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`runner_id`) REFERENCES `runners`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`category_id`) REFERENCES `race_categories`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`distance_id`) REFERENCES `race_distances`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`participant_type_id`) REFERENCES `participant_types`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `registrations_confirmation_code_unique` ON `registrations` (`confirmation_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `registrations_race_cedula_idx` ON `registrations` (`race_id`,`cedula`);--> statement-breakpoint
CREATE INDEX `registrations_race_status_idx` ON `registrations` (`race_id`,`status`);--> statement-breakpoint
CREATE INDEX `registrations_runner_idx` ON `registrations` (`runner_id`);--> statement-breakpoint
CREATE INDEX `registrations_bib_idx` ON `registrations` (`race_id`,`bib_number`);--> statement-breakpoint
CREATE TABLE `results` (
	`id` text PRIMARY KEY NOT NULL,
	`race_id` text NOT NULL,
	`registration_id` text NOT NULL,
	`finish_time_sec` integer NOT NULL,
	`category_position` integer,
	`overall_position` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`race_id`) REFERENCES `races`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `results_registration_id_unique` ON `results` (`registration_id`);--> statement-breakpoint
CREATE INDEX `results_race_pos_idx` ON `results` (`race_id`,`overall_position`);--> statement-breakpoint
CREATE TABLE `runners` (
	`id` text PRIMARY KEY NOT NULL,
	`cedula` text NOT NULL,
	`email` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`phone` text,
	`birth_date` text,
	`gender` text,
	`country` text DEFAULT 'Panamá',
	`photo_url` text,
	`banner_url` text,
	`bio` text,
	`instagram` text,
	`strava` text,
	`facebook` text,
	`tiktok` text,
	`personal_records` text,
	`favorite_races` text,
	`planned_races` text,
	`gear` text,
	`total_races` integer DEFAULT 0 NOT NULL,
	`public_profile` integer DEFAULT true NOT NULL,
	`public_fields` text,
	`password_hash` text,
	`password_salt` text,
	`session_token` text,
	`session_expiry` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `runners_cedula_unique` ON `runners` (`cedula`);--> statement-breakpoint
CREATE UNIQUE INDEX `runners_email_unique` ON `runners` (`email`);--> statement-breakpoint
CREATE INDEX `runners_session_idx` ON `runners` (`session_token`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sponsors` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`logo_url` text NOT NULL,
	`url` text,
	`level` text DEFAULT 'bronze' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sponsors_level_idx` ON `sponsors` (`level`,`sort_order`);--> statement-breakpoint
CREATE TABLE `teams` (
	`id` text PRIMARY KEY NOT NULL,
	`race_id` text NOT NULL,
	`name` text NOT NULL,
	`is_approved` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`race_id`) REFERENCES `races`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teams_race_name_idx` ON `teams` (`race_id`,`name`);--> statement-breakpoint
CREATE TABLE `timing_events` (
	`id` text PRIMARY KEY NOT NULL,
	`race_id` text NOT NULL,
	`registration_id` text,
	`bib_number` integer,
	`checkpoint` text DEFAULT 'finish' NOT NULL,
	`elapsed_sec` integer NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`recorded_at_ms` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`race_id`) REFERENCES `races`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `timing_race_bib_idx` ON `timing_events` (`race_id`,`bib_number`,`checkpoint`);