import {
  pgSchema,
  uuid,
  varchar,
  numeric,
  timestamp,
  boolean,
  customType,
} from "drizzle-orm/pg-core";
import { IDENTITY_LIMITS, USER_CONTEXT } from "./identity.constants";

/**
 * Reusable Custom PG Column Driver Mapper.
 * Explicitly forces PostgreSQL date values to map into clean, timezone-isolated YYYY-MM-DD strings.
 * Hardens parameter boundaries across both input and output serialization vectors.
 */
const pgDateString = customType<{ data: string; driverData: string | Date }>({
  dataType() {
    return "date";
  },
  fromDriver(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString().split("T")[0];
    }
    if (typeof value === "string") {
      return value.trim().split(" ")[0]; // Isolates date segment if time components bleed through
    }
    return String(value);
  },
  toDriver(value: string): string {
    // Basic structural verification constraint before flushing variables down to the wire
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new Error(
        `Inbound value "${value}" fails strict database YYYY-MM-DD date format constraints.`,
      );
    }
    return value;
  },
});

export const identitySchema = pgSchema("identity");

/**
 * Core User Account Persistence Entity.
 * Stores structural base credentials, compliance attributes, and shared balances.
 */
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

  birthDate: pgDateString("birth_date").notNull(),

  avatarUrl: varchar("avatar_url", { length: IDENTITY_LIMITS.avatarUrl.max })
    .notNull()
    .default("https://storage.vektora.io/avatars/default-placeholder.png"),

  currentContext: varchar("current_context", {
    length: IDENTITY_LIMITS.currentContext.max,
  })
    .notNull()
    .default(USER_CONTEXT.USER), // Uses the frozen constant instead of a hardcoded string literal

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

/**
 * Secondary Extended Talent Profile Persistence Entity.
 * Maps operational capability descriptors via a strict 1:1 relation back to the root User account.
 */
export const talents = identitySchema.table("talents", {
  id: uuid("id").primaryKey().defaultRandom(),

  /**
   * Unique foreign key reference enforces the strict 1:1 structural cardinality bond.
   * Declaring unique() automatically deploys a underlying unique B-Tree index in PostgreSQL,
   * rendering manual explicit layout indices redundant.
   */
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),

  bio: varchar("bio", { length: IDENTITY_LIMITS.bio.max }),

  skills: varchar("skills").array().notNull().default([]),
  isVerified: boolean("is_verified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
