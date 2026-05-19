import { users, talents } from "../identity.schema";

type UserRow = typeof users.$inferSelect;
type TalentRow = typeof talents.$inferSelect;

export class IdentitySerializer {
  /**
   * Map and filter database entity structures into public data contracts to prevent storage model leaks.
   * Explicitly drops sensitive database-only attributes like passwordHash from payload execution scopes.
   */
  static formatUser(user: UserRow) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      birthDate: user.birthDate,
      avatarUrl: user.avatarUrl,
      currentContext: user.currentContext,
      saldoWallet: user.saldoWallet,
      isVerified: user.isVerified,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  /**
   * Transform internal schema data variations into serialized primitives suitable for wire transport.
   */
  static formatTalent(talent: TalentRow) {
    return {
      id: talent.id,
      userId: talent.userId,
      bio: talent.bio,
      skills: talent.skills,
      isVerified: talent.isVerified,
      createdAt: talent.createdAt.toISOString(),
      updatedAt: talent.updatedAt.toISOString(),
    };
  }
}
