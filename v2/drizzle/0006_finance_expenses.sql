CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`race_id` text NOT NULL,
	`title` text NOT NULL,
	`beneficiary` text,
	`amount` real NOT NULL,
	`pay_date` text NOT NULL,
	`category` text,
	`method` text DEFAULT 'Yappy' NOT NULL,
	`reference` text,
	`notes` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`race_id`) REFERENCES `races`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `expenses_race_idx` ON `expenses` (`race_id`,`pay_date`);