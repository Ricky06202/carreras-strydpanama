CREATE TABLE `admin_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `login_attempts` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 1 NOT NULL,
	`window_start` text NOT NULL
);
--> statement-breakpoint
DROP INDEX `registrations_bib_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `registrations_race_bib_idx` ON `registrations` (`race_id`,`bib_number`);