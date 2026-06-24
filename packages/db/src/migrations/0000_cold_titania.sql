CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`overlay_token` text NOT NULL,
	`pending_spin` text
);
--> statement-breakpoint
CREATE TABLE `slots` (
	`id` text PRIMARY KEY NOT NULL,
	`sort_order` integer NOT NULL,
	`label` text NOT NULL,
	`weight` integer DEFAULT 1 NOT NULL,
	`color` text,
	`enabled` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `spins` (
	`id` text PRIMARY KEY NOT NULL,
	`slot_id` text NOT NULL,
	`label` text NOT NULL,
	`at` integer DEFAULT (unixepoch()) NOT NULL
);
