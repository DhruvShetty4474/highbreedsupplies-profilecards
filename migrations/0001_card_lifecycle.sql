CREATE TABLE `counters` (
	`name` text PRIMARY KEY NOT NULL,
	`value` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE `cards` ADD `programming_status` text DEFAULT 'UNPROGRAMMED' NOT NULL;--> statement-breakpoint
-- Backfill from the old boolean before it is dropped in 0002.
UPDATE `cards` SET `programming_status` = 'PROGRAMMED' WHERE `programming_verified` = 1;
--> statement-breakpoint
-- Start the card_id counter after the highest existing HBnnnnnn.
INSERT INTO `counters` (`name`, `value`)
SELECT 'card_id', COALESCE(MAX(CAST(SUBSTR(`card_id`, 3) AS INTEGER)), 0) FROM `cards` WHERE true
ON CONFLICT(`name`) DO NOTHING;
