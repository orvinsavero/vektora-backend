import {
  pgSchema,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { users } from "../identity/identity.schema";

export const catalogSchema = pgSchema("catalog");

/**
 * Core Talent Storefront Profiles Table.
 * Tracks base seller credentials and structural metadata parameters.
 */
export const talents = catalogSchema.table("talents", {
  id: uuid("id").primaryKey().defaultRandom(),

  /**
   * Unique foreign key reference enforces a strict 1:1 structural cardinality bond back to identity.
   */
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),

  bio: varchar("bio", { length: 1000 }), // Bound to future catalog limit constants

  skills: varchar("skills").array().notNull().default([]),
  isVerified: boolean("is_verified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * Talent Portfolio Proof-of-Work Showcase Table.
 * Tracks media assets and historical projects demonstrating seller capabilities (1:N relationship).
 */
export const portfolios = catalogSchema.table("portfolios", {
  id: uuid("id").primaryKey().defaultRandom(),
  talentId: uuid("talent_id")
    .notNull()
    .references(() => talents.userId, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  mediaUrl: varchar("media_url", { length: 500 }).notNull(),
  externalLink: varchar("external_link", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Productized Service Offerings (Gigs) Table.
 * Stores immutable metadata parameters defining sellable catalog listings (1:N relationship).
 */
export const gigs = catalogSchema.table("gigs", {
  id: uuid("id").primaryKey().defaultRandom(),
  talentId: uuid("talent_id")
    .notNull()
    .references(() => talents.userId, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  basePrice: integer("base_price").notNull(), // Integer based (cents/IDR raw) to bypass float arithmetic bugs
  deliveryDays: integer("delivery_days").notNull(),
  revisionsAllowed: integer("revisions_allowed").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
