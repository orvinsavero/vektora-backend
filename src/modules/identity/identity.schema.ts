import {
  pgSchema,
  uuid,
  varchar,
  numeric,
  timestamp,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { IDENTITY_LIMITS } from "./identity.constants";

export const identitySchema = pgSchema("identity");

// Base operational profile storage entity containing shared identification constraints and system states
export const users = identitySchema.table("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: IDENTITY_LIMITS.email.max })
    .notNull()
    .unique(),
  username: varchar("username", { length: IDENTITY_LIMITS.username.max })
    .notNull()
    .unique(),
  fullName: varchar("full_name", { length: IDENTITY_LIMITS.fullName.max }),
  avatarUrl: varchar("avatar_url", {
    length: IDENTITY_LIMITS.avatarUrl.max,
  }).notNull(),
  currentContext: varchar("current_context", {
    length: IDENTITY_LIMITS.currentContext.max,
  })
    .notNull()
    .default("USER"),
  saldoWallet: numeric("saldo_wallet", {
    precision: IDENTITY_LIMITS.saldoWallet.precision,
    scale: IDENTITY_LIMITS.saldoWallet.scale,
  })
    .notNull()
    .default("0.00"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Secondary domain profile entity linked via a one-to-one mapping with cascade deletion semantics
export const talents = identitySchema.table(
  "talents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    bio: varchar("bio", { length: IDENTITY_LIMITS.bio.max }),
    skills: varchar("skills").array().notNull().default([]),
    isVerified: boolean("is_verified").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    // B-Tree lookup optimizing pointer resolutions on joined profile execution paths
    index("talents_user_id_idx").on(table.userId),
  ],
);
