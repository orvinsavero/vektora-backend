import { users } from "../identity.schema";

/** Structural API contract definitions mapping outbound network response shapes explicitly */
export interface SerializedUserResponse {
  id: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  birthDate: string | null;
  avatarUrl: string | null;
  currentContext: string;
  saldoWallet: string | number;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SerializedTalentResponse {
  id: string;
  userId: string;
  bio: string | null;
  skills: string[];
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Lightweight, high-performance DTO contract for client-side state hydration upon successful login/registration */
export interface SerializedAuthResponse {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  currentContext: "USER" | "TALENT" | string;
}

/** Strict outbound wire payload contract definition for self-service personal identity lookups */
export interface SerializedUserProfileResponse {
  id: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  birthDate: string;
  avatarUrl: string | null;
  currentContext: string;
  saldoWallet: number;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  language: string;
  theme: string;
  timezone: string;
}

type UserRow = typeof users.$inferSelect;

/**
 * Data Transformation and Serialization Layer.
 * Intercepts internal relational storage entities and converts them into strict public wire contracts.
 * Decouples system schema dependencies and isolates sensitive parameters to secure the API boundary.
 */
export class IdentitySerializer {
  /**
   * Sanitizes and maps database user records into standardized data schemas.
   * Explicitly drops system internals such as password hashes from outbound visibility.
   * @param {UserRow} user - Source internal database selection schema row.
   * @returns {SerializedUserResponse} Transformed public data contract representation.
   */
  static formatUser(user: UserRow): SerializedUserResponse {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      birthDate: user.birthDate ?? null,
      avatarUrl:
        user.avatarUrl ??
        "https://storage.vektora.io/avatars/default-placeholder.png",
      currentContext: user.currentContext,
      saldoWallet: user.saldoWallet,
      isVerified: user.isVerified,
      isActive: user.isActive,
      createdAt: (user.createdAt ?? new Date()).toISOString(),
      updatedAt: (user.updatedAt ?? new Date()).toISOString(),
    };
  }

  /**
   * Trims down raw database records into a lean, optimized object
   * specifically built to bootstrap the client-side UI upon authentication.
   * Eliminates system metadata, balances, and timestamps to optimize wire size.
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
      avatarUrl: user.avatarUrl ?? null,
      currentContext: user.currentContext,
    };
  }

  /**
   * Transmutes raw relational database records into an unprivileged personal account overview.
   * Enforces rigorous data sanitization loops and casts structural balance constraints securely.
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
      saldoWallet: Number(user.saldoWallet || 0), // Explicit protection against numeric database string mappings
      isVerified: user.isVerified,
      language: user.language,
      theme: user.theme,
      timezone: user.timezone,
      createdAt: (user.createdAt ?? new Date()).toISOString(),
      updatedAt: (user.updatedAt ?? new Date()).toISOString(),
    };
  }
}
