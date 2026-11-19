ALTER TABLE `cards` ADD `activation_code` text;--> statement-breakpoint
ALTER TABLE `cards` ADD `reserved_at` text;--> statement-breakpoint
-- Backfill: every existing card gets a random 6-character code (hex here;
-- new cards use the unambiguous alphabet in src/lib/cards.ts).
UPDATE `cards` SET `activation_code` = upper(hex(randomblob(3))) WHERE `activation_code` IS NULL;--> statement-breakpoint
UPDATE `cards` SET `reserved_at` = `updated_at` WHERE `status` = 'RESERVED' AND `reserved_at` IS NULL;
