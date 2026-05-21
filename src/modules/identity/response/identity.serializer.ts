import { users } from "../identity.schema";

type UserRow = typeof users.$inferSelect;

/** * 1. REGISTRATION / LOGIN RESPONSE CONTRACT (Lean & UX Bootstrapping)
 * Specifically optimized to hydrate global client app states (Zustand/Redux) upon authentication.
 * Includes nested preferences to instantly configure UI rules without extra API roundtrips.
 */
export interface SerializedAuthResponse {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  currentContext: string;
  preferences: {
    language: string;
    theme: string;
    timezone: string;
  };
}

/** * 2. FULL PROFILE RESPONSE CONTRACT (Fully Hydrated Dashboard & Settings)
 * Built to completely populate the personal profile management panel with metadata configuration blocks.
 */
export interface SerializedUserProfileResponse {
  id: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  birthDate: string;
  avatarUrl: string;
  currentContext: string;
  saldoWallet: number;
  isVerified: boolean;
  isActive: boolean;
  language: string;
  theme: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

type AssertExtends<T extends U, U> = true;

/**
 * Strict Compile-Time Structural Serialization Contract.
 * Guarantees that if schema columns shift, the serializer layer breaks compilation instantly.
 */
type EnforceSerializerContract = AssertExtends<
  {
    [K in keyof SerializedUserProfileResponse]: SerializedUserProfileResponse[K];
  },
  {
    id: UserRow["id"];
    email: UserRow["email"];
    username: UserRow["username"];
    firstName: UserRow["firstName"];
    lastName: UserRow["lastName"];
    birthDate: UserRow["birthDate"];
    avatarUrl: UserRow["avatarUrl"];
    currentContext: UserRow["currentContext"];
    saldoWallet: number;
    isVerified: UserRow["isVerified"];
    isActive: UserRow["isActive"];
    language: UserRow["language"];
    theme: UserRow["theme"];
    timezone: UserRow["timezone"];
    createdAt: string;
    updatedAt: string;
  }
>;

/**
 * Data Transformation and Serialization Layer.
 * Decouples internal database entities from outward-facing wire payload architectures.
 */
export class IdentitySerializer {
  /**
   * Trims down raw database records into a high-performance session payload for Auth gates.
   * Maps to: POST /api/identity/register-user, POST /api/identity/login
   * @param {UserRow} user - Source internal database selection schema row.
   * @returns {SerializedAuthResponse} Hardened UI hydration wire profile.
   */
  static formatAuthResponse(user: UserRow): SerializedAuthResponse {
    return {
      id: user.id,
      username: user.username,
      displayName:
        `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
        user.username,
      avatarUrl: user.avatarUrl,
      currentContext: user.currentContext,
      preferences: {
        language: user.language,
        theme: user.theme,
        timezone: user.timezone,
      },
    };
  }

  /**
   * Transmutes raw relational database records into an unprivileged personal account overview.
   * Maps to: GET /api/identity/profile, PATCH /api/identity/profile, PUT /api/identity/account
   * @param {UserRow} user - Source internal database selection schema row.
   * @returns {SerializedUserProfileResponse} Sanitized personal identity overview contract.
   */
  static formatUserProfile(user: UserRow): SerializedUserProfileResponse {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      birthDate: user.birthDate,
      avatarUrl: user.avatarUrl,
      currentContext: user.currentContext,
      saldoWallet: Number(user.saldoWallet || 0),
      isVerified: user.isVerified,
      isActive: user.isActive,
      language: user.language,
      theme: user.theme,
      timezone: user.timezone,
      createdAt: (user.createdAt ?? new Date()).toISOString(),
      updatedAt: (user.updatedAt ?? new Date()).toISOString(),
    };
  }
}
