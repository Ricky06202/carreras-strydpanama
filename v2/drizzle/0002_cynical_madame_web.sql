PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_registrations` (
	`id` text PRIMARY KEY NOT NULL,
	`race_id` text NOT NULL,
	`runner_id` text,
	`confirmation_code` text NOT NULL,
	`title` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`cedula` text,
	`birth_date` text,
	`gender` text,
	`country` text,
	`category_id` text,
	`distance_id` text,
	`participant_type_id` text,
	`team_id` text,
	`team_name` text,
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
INSERT INTO `__new_registrations`("id", "race_id", "runner_id", "confirmation_code", "title", "first_name", "last_name", "email", "phone", "cedula", "birth_date", "gender", "country", "category_id", "distance_id", "participant_type_id", "team_id", "team_name", "bib_number", "shirt_size", "status", "payment_status", "amount_paid", "discount_code", "finish_time_sec", "checkpoint_time_sec", "timing_source", "timing_confidence", "is_padrino", "donated_tickets", "shipping_address", "student_id_url", "matricula_url", "photo_url", "created_at", "updated_at") SELECT "id", "race_id", "runner_id", "confirmation_code", "title", "first_name", "last_name", "email", "phone", "cedula", "birth_date", "gender", "country", "category_id", "distance_id", "participant_type_id", "team_id", "team_name", "bib_number", "shirt_size", "status", "payment_status", "amount_paid", "discount_code", "finish_time_sec", "checkpoint_time_sec", "timing_source", "timing_confidence", "is_padrino", "donated_tickets", "shipping_address", "student_id_url", "matricula_url", "photo_url", "created_at", "updated_at" FROM `registrations`;--> statement-breakpoint
DROP TABLE `registrations`;--> statement-breakpoint
ALTER TABLE `__new_registrations` RENAME TO `registrations`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `registrations_confirmation_code_unique` ON `registrations` (`confirmation_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `registrations_race_cedula_idx` ON `registrations` (`race_id`,`cedula`);--> statement-breakpoint
CREATE INDEX `registrations_race_status_idx` ON `registrations` (`race_id`,`status`);--> statement-breakpoint
CREATE INDEX `registrations_runner_idx` ON `registrations` (`runner_id`);--> statement-breakpoint
CREATE INDEX `registrations_bib_idx` ON `registrations` (`race_id`,`bib_number`);