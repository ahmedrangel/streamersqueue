CREATE TABLE `control` (
	`id` integer PRIMARY KEY NOT NULL,
	`last_updated` text,
	`renewing` integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `history` (
	`puuid` text,
	`match_id` text,
	`kills` integer,
	`deaths` integer,
	`assists` integer,
	`is_remake` integer,
	`result` integer,
	`champion` integer,
	`game_surrendered` integer,
	PRIMARY KEY(`match_id`, `puuid`),
	FOREIGN KEY (`puuid`) REFERENCES `participants`(`puuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`match_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `matches` (
	`match_id` text PRIMARY KEY NOT NULL,
	`date` integer,
	`duration` integer
);
--> statement-breakpoint
CREATE TABLE `participants` (
	`puuid` text PRIMARY KEY NOT NULL,
	`summoner_id` text,
	`riot_name` text,
	`riot_tag` text,
	`is_ingame` integer DEFAULT 0,
	`wins` integer DEFAULT 0,
	`losses` integer DEFAULT 0,
	`lp` integer,
	`elo` text,
	`tier` text,
	`lol_picture` integer,
	`lol_region` text,
	`position` integer,
	`position_change` integer DEFAULT 0,
	`control` integer,
	FOREIGN KEY (`control`) REFERENCES `control`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `socials` (
	`puuid` text PRIMARY KEY NOT NULL,
	`twitch_id` text,
	`twitch_login` text,
	`twitch_display` text,
	`twitch_is_live` integer DEFAULT 0,
	`twitch_picture` text,
	`instagram` text,
	`twitter` text,
	`country_flag` text,
	FOREIGN KEY (`puuid`) REFERENCES `participants`(`puuid`) ON UPDATE no action ON DELETE no action
);
