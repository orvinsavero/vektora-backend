CREATE TABLE "catalog"."categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"parent_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name"),
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "catalog"."gig_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gig_id" uuid NOT NULL,
	"media_url" varchar(500) NOT NULL,
	"media_type" varchar(20) NOT NULL,
	"is_cover" boolean DEFAULT false NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog"."gig_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gig_id" uuid NOT NULL,
	"tier" varchar(20) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text NOT NULL,
	"price" integer NOT NULL,
	"delivery_days" integer NOT NULL,
	"revisions_allowed" integer NOT NULL,
	"features" varchar[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog"."portfolio_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portfolio_id" uuid NOT NULL,
	"media_url" varchar(500) NOT NULL,
	"media_type" varchar(20) NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog"."reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gig_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"rating" smallint NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "catalog"."gigs" ADD COLUMN "category_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "catalog"."gigs" ADD COLUMN "rating_cache" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "catalog"."gigs" ADD COLUMN "review_count_cache" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "catalog"."talents" ADD COLUMN "rating_cache" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "catalog"."talents" ADD COLUMN "review_count_cache" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "catalog"."categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "catalog"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."gig_attachments" ADD CONSTRAINT "gig_attachments_gig_id_gigs_id_fk" FOREIGN KEY ("gig_id") REFERENCES "catalog"."gigs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."gig_packages" ADD CONSTRAINT "gig_packages_gig_id_gigs_id_fk" FOREIGN KEY ("gig_id") REFERENCES "catalog"."gigs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."portfolio_attachments" ADD CONSTRAINT "portfolio_attachments_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "catalog"."portfolios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."reviews" ADD CONSTRAINT "reviews_gig_id_gigs_id_fk" FOREIGN KEY ("gig_id") REFERENCES "catalog"."gigs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."reviews" ADD CONSTRAINT "reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "identity"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."gigs" ADD CONSTRAINT "gigs_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "catalog"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."gigs" DROP COLUMN "base_price";--> statement-breakpoint
ALTER TABLE "catalog"."gigs" DROP COLUMN "delivery_days";--> statement-breakpoint
ALTER TABLE "catalog"."gigs" DROP COLUMN "revisions_allowed";--> statement-breakpoint
ALTER TABLE "catalog"."portfolios" DROP COLUMN "media_url";