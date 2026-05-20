ALTER TABLE "identity"."users" ADD COLUMN "language" varchar(10) DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "identity"."users" ADD COLUMN "theme" varchar(20) DEFAULT 'system' NOT NULL;--> statement-breakpoint
ALTER TABLE "identity"."users" ADD COLUMN "timezone" varchar(50) DEFAULT 'UTC' NOT NULL;