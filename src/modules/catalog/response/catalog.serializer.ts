import { talents } from "../catalog.schema";

export interface SerializedTalentResponse {
  id: string;
  userId: string;
  bio: string | null;
  skills: string[];
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

type TalentRow = typeof talents.$inferSelect;

/**
 * Catalog Domain Transformation Layer.
 * Sanitizes internal database storage layers into structured public wire models.
 */
export class CatalogSerializer {
  static formatTalent(talent: TalentRow): SerializedTalentResponse {
    return {
      id: talent.id,
      userId: talent.userId,
      bio: talent.bio ?? null,
      skills: Array.isArray(talent.skills) ? (talent.skills as string[]) : [],
      isVerified: talent.isVerified,
      createdAt: (talent.createdAt ?? new Date()).toISOString(),
      updatedAt: (talent.updatedAt ?? new Date()).toISOString(),
    };
  }
}
