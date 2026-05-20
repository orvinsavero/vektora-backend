CREATE SCHEMA "catalog";
--> statement-breakpoint
CREATE SCHEMA "identity";
--> statement-breakpoint
CREATE TABLE "catalog"."gigs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"talent_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"base_price" integer NOT NULL,
	"delivery_days" integer NOT NULL,
	"revisions_allowed" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog"."portfolios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"talent_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"media_url" varchar(500) NOT NULL,
	"external_link" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog"."talents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"bio" varchar(1000),
	"skills" varchar[] DEFAULT '{}' NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "talents_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "identity"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"username" varchar(50) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"birth_date" date NOT NULL,
	"avatar_url" varchar(500) DEFAULT 'https://storage.vektora.io/avatars/default-placeholder.png' NOT NULL,
	"current_context" varchar(20) DEFAULT 'USER' NOT NULL,
	"saldo_wallet" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "catalog"."gigs" ADD CONSTRAINT "gigs_talent_id_talents_user_id_fk" FOREIGN KEY ("talent_id") REFERENCES "catalog"."talents"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."portfolios" ADD CONSTRAINT "portfolios_talent_id_talents_user_id_fk" FOREIGN KEY ("talent_id") REFERENCES "catalog"."talents"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."talents" ADD CONSTRAINT "talents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE cascade ON UPDATE no action;