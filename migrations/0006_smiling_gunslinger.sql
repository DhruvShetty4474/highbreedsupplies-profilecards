PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
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
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`card_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`manager_id`) REFERENCES `profiles`(`user_id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`cash_approved_by`) REFERENCES `profiles`(`user_id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_orders`("id", "user_id", "card_id", "manager_id", "status", "method", "amount_paise", "gst_rate_bp", "customer_name", "customer_phone", "customer_email", "customer_gstin", "customer_address", "terms_accepted_at", "razorpay_order_id", "razorpay_payment_id", "cash_code_hash", "cash_code_expires_at", "cash_code_attempts", "cash_approved_by", "invoice_no", "paid_at", "created_at", "updated_at") SELECT "id", "user_id", "card_id", "manager_id", "status", "method", "amount_paise", "gst_rate_bp", "customer_name", "customer_phone", "customer_email", "customer_gstin", "customer_address", "terms_accepted_at", "razorpay_order_id", "razorpay_payment_id", "cash_code_hash", "cash_code_expires_at", "cash_code_attempts", "cash_approved_by", "invoice_no", "paid_at", "created_at", "updated_at" FROM `orders`;--> statement-breakpoint
DROP TABLE `orders`;--> statement-breakpoint
ALTER TABLE `__new_orders` RENAME TO `orders`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `orders_razorpay_order_id_unique` ON `orders` (`razorpay_order_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_razorpay_payment_id_unique` ON `orders` (`razorpay_payment_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_invoice_no_unique` ON `orders` (`invoice_no`);--> statement-breakpoint
CREATE INDEX `idx_orders_user` ON `orders` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_orders_card` ON `orders` (`card_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_orders_manager` ON `orders` (`manager_id`,`status`);