CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`card_id` text NOT NULL,
	`manager_id` text,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`method` text,
	`amount_paise` integer NOT NULL,
	`gst_rate_bp` integer NOT NULL,
	`customer_name` text DEFAULT '' NOT NULL,
	`customer_phone` text DEFAULT '' NOT NULL,
	`customer_email` text DEFAULT '' NOT NULL,
	`customer_gstin` text,
	`customer_address` text DEFAULT '' NOT NULL,
	`terms_accepted_at` text,
	`razorpay_order_id` text,
	`razorpay_payment_id` text,
	`cash_code_hash` text,
	`cash_code_expires_at` text,
	`cash_code_attempts` integer DEFAULT 0 NOT NULL,
	`cash_approved_by` text,
	`invoice_no` text,
	`paid_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`card_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`manager_id`) REFERENCES `profiles`(`user_id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`cash_approved_by`) REFERENCES `profiles`(`user_id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_razorpay_order_id_unique` ON `orders` (`razorpay_order_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_razorpay_payment_id_unique` ON `orders` (`razorpay_payment_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_invoice_no_unique` ON `orders` (`invoice_no`);--> statement-breakpoint
CREATE INDEX `idx_orders_user` ON `orders` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_orders_card` ON `orders` (`card_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_orders_manager` ON `orders` (`manager_id`,`status`);--> statement-breakpoint
ALTER TABLE `card_batches` ADD `manager_id` text REFERENCES profiles(user_id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `cards` ADD `manager_id` text REFERENCES profiles(user_id) ON DELETE SET NULL;--> statement-breakpoint
CREATE INDEX `idx_cards_manager` ON `cards` (`manager_id`);--> statement-breakpoint
ALTER TABLE `profiles` ADD `referred_by` text;--> statement-breakpoint
CREATE INDEX `idx_profiles_referred_by` ON `profiles` (`referred_by`);