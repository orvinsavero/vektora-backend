CREATE SCHEMA "identity";
--> statement-breakpoint
CREATE TABLE "identity"."talents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"bio" varchar(1000),
	"skills" varchar[] DEFAULT '{}' NOT NULL,
	"is_verified" varchar(20) DEFAULT 'FALSE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "talents_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "identity"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"username" varchar(50) NOT NULL,
	"full_name" varchar(100),
	"avatar_url" varchar(500) NOT NULL,
	"current_context" varchar(20) DEFAULT 'USER' NOT NULL,
	"saldo_wallet" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "identity"."talents" ADD CONSTRAINT "talents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE cascade ON UPDATE no action;