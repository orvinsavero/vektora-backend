import {
  pgSchema,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  boolean,
  smallint,
} from "drizzle-orm/pg-core";
import { users } from "../identity/identity.schema";
import { CATALOG_LIMITS } from "./catalog.constants";

export const catalogSchema = pgSchema("catalog");

/**
 * 1. CATEGORIES MANAGEMENT LAYER
 * Explicit hierarchical self-referencing structure for high-frequency navigation, searching, and filtering.
 */
export const categories = catalogSchema.table("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  slug: varchar("slug", { length: 100 }).notNull().unique(), // Optimized for frontend SEO path routing
  parentId: uuid("parent_id").references((): any => categories.id, {
    onDelete: "cascade",
  }), // Nullable means a root top-level category
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * 2. CORE SELLER STOREFRONT PROFILES (Talents)
 * Links users to their seller profiles and maintains aggregate reputation score metrics.
 */
export const talents = catalogSchema.table("talents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  bio: varchar("bio", { length: CATALOG_LIMITS.bio.max }),
  skills: varchar("skills").array().notNull().default([]),
  isVerified: boolean("is_verified").notNull().default(false),
  ratingCache: integer("rating_cache").default(0).notNull(), // Multiplied by 100 (e.g. 475 = 4.75) to completely avoid float inaccuracies
  reviewCountCache: integer("review_count_cache").default(0).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * 3. TALENT PORTFOLIO SHOWCASE ENTRIES
 */
export const portfolios = catalogSchema.table("portfolios", {
  id: uuid("id").primaryKey().defaultRandom(),
  talentId: uuid("talent_id")
    .notNull()
    .references(() => talents.userId, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  externalLink: varchar("external_link", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * 4. PORTFOLIO MULTI-MEDIA ATTACHMENTS
 * Industry best-practice for ordered carousels (multiple photos and videos per portfolio entry).
 */
export const portfolioAttachments = catalogSchema.table(
  "portfolio_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    portfolioId: uuid("portfolio_id")
      .notNull()
      .references(() => portfolios.id, { onDelete: "cascade" }),
    mediaUrl: varchar("media_url", { length: 500 }).notNull(),
    mediaType: varchar("media_type", { length: 20 }).notNull(), // "IMAGE" | "VIDEO" | "DOCUMENT"
    sortOrder: smallint("sort_order").default(0).notNull(), // Controls presentation sequence on frontend sliders
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
);

/**
 * 5. PRODUCTIZED SERVICE OFFERINGS (Gigs)
 */
export const gigs = catalogSchema.table("gigs", {
  id: uuid("id").primaryKey().defaultRandom(),
  talentId: uuid("talent_id")
    .notNull()
    .references(() => talents.userId, { onDelete: "cascade" }),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => categories.id),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  ratingCache: integer("rating_cache").default(0).notNull(),
  reviewCountCache: integer("review_count_cache").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * 6. GIG MULTI-MEDIA ATTACHMENTS
 * Handles frontend marketplace feed thumbnails and media gallery displays.
 */
export const gigAttachments = catalogSchema.table("gig_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  gigId: uuid("gig_id")
    .notNull()
    .references(() => gigs.id, { onDelete: "cascade" }),
  mediaUrl: varchar("media_url", { length: 500 }).notNull(),
  mediaType: varchar("media_type", { length: 20 }).notNull(), // "IMAGE" | "VIDEO"
  isCover: boolean("is_cover").default(false).notNull(), // Flag to fetch catalog feed thumbnails instantly
  sortOrder: smallint("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * 7. TIERED SERVICE PACKAGES (Basic, Standard, Premium)
 */
export const gigPackages = catalogSchema.table("gig_packages", {
  id: uuid("id").primaryKey().defaultRandom(),
  gigId: uuid("gig_id")
    .notNull()
    .references(() => gigs.id, { onDelete: "cascade" }),
  tier: varchar("tier", { length: 20 }).notNull(), // "BASIC" | "STANDARD" | "PREMIUM"
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(), // Represented in lowest sub-units (or raw IDR) to evade floating point arithmetic
  deliveryDays: integer("delivery_days").notNull(),
  revisionsAllowed: integer("revisions_allowed").notNull(),
  features: varchar("features").array().notNull().default([]), // Key-value or plain scope descriptions
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * 8. TRUST & RATING REVIEWS
 */
export const reviews = catalogSchema.table("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  gigId: uuid("gig_id")
    .notNull()
    .references(() => gigs.id, { onDelete: "cascade" }),
  reviewerId: uuid("reviewer_id")
    .notNull()
    .references(() => users.id),
  rating: smallint("rating").notNull(), // Int values from 1 to 5
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
