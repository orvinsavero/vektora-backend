import {
  pgSchema,
  uuid,
  varchar,
  numeric,
  timestamp,
  boolean,
  index,
  customType, // Swapped standard 'date' for Drizzle's custom type engine wrapper
} from "drizzle-orm/pg-core";
import { IDENTITY_LIMITS } from "./identity.constants";

/**
 * Reusable Custom PG Column Driver Mapper.
 * Explicitly forces PostgreSQL date values to map into clean, timezone-isolated YYYY-MM-DD strings.
 */
const pgDateString = customType<{ data: string }>({
  dataType() {
    return "date";
  },
  fromDriver(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString().split("T")[0];
    }
    return String(value);
  },
  toDriver(value: string): string {
    return value;
  },
});

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
  passwordHash: varchar("password_hash", {
    length: IDENTITY_LIMITS.password.hash.max,
  }).notNull(),
  firstName: varchar("first_name", { length: IDENTITY_LIMITS.firstName.max }),
  lastName: varchar("last_name", { length: IDENTITY_LIMITS.lastName.max }),
  // Consumes our custom date mapper to guarantee clean application-side string synchronization
  birthDate: pgDateString("birth_date").notNull(),
  avatarUrl: varchar("avatar_url", { length: IDENTITY_LIMITS.avatarUrl.max })
    .notNull()
    .default("https://storage.vektora.io/avatars/default-placeholder.png"),
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
  isVerified: boolean("is_verified").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
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
