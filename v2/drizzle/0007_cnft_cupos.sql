CREATE TABLE `athlete_wallets` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_type` text NOT NULL,
	`owner_id` text NOT NULL,
	`network` text NOT NULL,
	`public_key` text NOT NULL,
	`secret_cipher` text,
	`secret_iv` text,
	`key_version` integer DEFAULT 1 NOT NULL,
	`managed` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `athlete_wallets_owner_idx` ON `athlete_wallets` (`owner_type`,`owner_id`,`network`);
--> statement-breakpoint
CREATE TABLE `cnft_tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`registration_id` text NOT NULL,
	`race_id` text NOT NULL,
	`wallet_id` text,
	`network` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`mock` integer DEFAULT true NOT NULL,
	`asset_id` text,
	`owner_address` text,
	`signature` text,
	`tree_address` text,
	`metadata_uri` text,
	`metadata_json` text,
	`provider` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`minted_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`race_id`) REFERENCES `races`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`wallet_id`) REFERENCES `athlete_wallets`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cnft_tickets_registration_idx` ON `cnft_tickets` (`registration_id`);
--> statement-breakpoint
CREATE INDEX `cnft_tickets_race_idx` ON `cnft_tickets` (`race_id`,`status`);
--> statement-breakpoint
CREATE INDEX `cnft_tickets_asset_idx` ON `cnft_tickets` (`asset_id`);
--> statement-breakpoint
CREATE INDEX `cnft_tickets_owner_idx` ON `cnft_tickets` (`owner_address`);
