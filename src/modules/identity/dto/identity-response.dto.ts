import { users, talents } from "../identity.schema";

type UserRow = typeof users.$inferSelect;
type TalentRow = typeof talents.$inferSelect;

export class IdentityResponseDto {
  // Map and filter database entity structures into public data contracts to prevent storage model leaks
  static formatUser(user: UserRow) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      currentContext: user.currentContext,
      saldoWallet: user.saldoWallet,
      createdAt: user.createdAt.toISOString(),
    };
  }

  // Transform internal schema data variations into serialized primitives suitable for wire transport
  static formatTalent(talent: TalentRow) {
    return {
      id: talent.id,
      userId: talent.userId,
      bio: talent.bio,
      skills: talent.skills,
      createdAt: talent.createdAt.toISOString(),
    };
  }
}
