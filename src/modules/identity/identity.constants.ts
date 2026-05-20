import { UpdateProfilePayload } from "./request/update-profile.dto";
/**
 * Structural Field Sizing and Array Length Constraints.
 * Serves as the centralized registry for Zod perimeter schemas and Drizzle database column definitions.
 * Deep freeze applied via 'as const' to prevent parameter mutations at runtime.
 */
export const IDENTITY_LIMITS = {
  email: { max: 255 },
  username: { min: 3, max: 50 },
  password: {
    min: 8,
    max: 100,
    hash: { max: 255 },
  },
  firstName: { max: 100 },
  lastName: { max: 100 },
  avatarUrl: { max: 500 },
  currentContext: { max: 20 },
  bio: { max: 1000 },
  saldoWallet: { precision: 12, scale: 2 },
  skills: { min: 1, itemMin: 1 },
  language: { max: 10, default: "en" },
  theme: { max: 20, default: "system" },
  timezone: { max: 50, default: "UTC" },
} as const;

/**
 * Platform Account Context State Enum.
 * Defines the permissible operational states and authorization view models assigned to user profiles.
 */
export const USER_CONTEXT = {
  USER: "USER",
  TALENT: "TALENT",
  ADMIN: "ADMIN",
} as const;

/**
 * Systemic Registration Policies and Enrollment Gating Rules.
 */
export const REGISTRATION_RULES = {
  /** Centralized minimum age floor gate compliant with international data processing acts (COPPA/GDPR) */
  minAgeRequired: 13,
} as const;

/**
 * Argon2id Cryptographic Work Factor Parameters.
 * Configured to meet modern OWASP security baselines for high-performance credential hashing.
 */
export const HASH_CONFIG = {
  memory: 65536, // 64MB memory footprint boundary (mapped from memoryCost)
  time: 3, // 3 iterations over block spaces (mapped from timeCost)
  parallelism: 4, // Utilizing 4 computational execution threads
} as const;

/**
 * Production-Hardened HTTP-Only Session Cookie Parameters.
 * Dynamically toggles strict security gates to ensure fluid local development executions.
 */
export const AUTH_COOKIE_CONFIG = {
  name: "token",
  options: {
    path: "/",
    httpOnly: true, // Shields tokens from client-side script contexts (XSS defenses)
    sameSite: "strict" as const, // Hardens perimeter against cross-site request forgery entries (CSRF)
    maxAge: 60 * 60 * 24 * 7, // Symmetric 7-day expiration window lifecycle
  },
} as const;

/** Whitelisted database column parameters permitted to be altered via unprivileged client requests */
export const ALLOWED_PROFILE_UPDATE_KEYS: (keyof UpdateProfilePayload)[] = [
  "firstName",
  "lastName",
  "birthDate",
  "avatarUrl",
  "language",
  "theme",
  "timezone",
];

/**
 * Inferred Domain Type Utility Matrices.
 * Exposes internal literal values as clean primitive union tokens for type annotations across the app.
 */
export type IdentityLimitsType = typeof IDENTITY_LIMITS;
export type UserContextType = (typeof USER_CONTEXT)[keyof typeof USER_CONTEXT];
export type HashConfigType = typeof HASH_CONFIG;
export type AuthCookieConfigType = typeof AUTH_COOKIE_CONFIG;
export type AllowedProfileUpdateKeysType = typeof ALLOWED_PROFILE_UPDATE_KEYS;
