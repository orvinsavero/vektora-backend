import { users, talents } from "../identity.schema";

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

type UserRow = typeof users.$inferSelect;
type TalentRow = typeof talents.$inferSelect;

/**
 * Data Transformation and Serialization Layer.
 * Intercepts internal relational storage entities and converts them into strict public wire contracts.
 * Decouples system schema dependencies and isolates sensitive parameters to secure the API boundary.
 */
export class IdentitySerializer {
  /**
   * Sanitizes and maps database user records into standardized data schemas.
   * Explicitly drops system internals such as password hashes from outbound visibility.
   * * @param {UserRow} user - Source internal database selection schema row.
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
   * Sanitizes and transforms structural database talent profile entities into public contracts.
   * * @param {TalentRow} talent - Source internal database talent profile row.
   * @returns {SerializedTalentResponse} Transformed public data contract representation.
   */
  static formatTalent(talent: TalentRow): SerializedTalentResponse {
    return {
      id: talent.id,
      userId: talent.userId,
      bio: talent.bio ?? null,
      skills: Array.isArray(talent.skills) ? talent.skills : [],
      isVerified: talent.isVerified,
      createdAt: (talent.createdAt ?? new Date()).toISOString(),
      updatedAt: (talent.updatedAt ?? new Date()).toISOString(),
    };
  }
}
