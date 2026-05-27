import { users } from "../../identity.schema";

type UserRow = typeof users.$inferSelect;

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

/**
 * Identity Layer Data Transformation Engine.
 * Decouples relational database schemas from client wire transmission contracts.
 */
export class IdentitySerializer {
  /**
   * Sanitizes database state into a lean frontend application bootstrapping context.
   * Target Endpoints: POST /api/identity/login, POST /api/identity/register-user
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
   * Hydrates the complete profile dashboard view context, preserving critical preferences.
   * Target Endpoints: GET /api/identity/profile, PATCH /api/identity/profile, PUT /api/identity/account
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
