// src/modules/catalog/response/catalog.serializer.ts
import { talents } from "../catalog.schema";

type TalentRow = typeof talents.$inferSelect;

export interface SerializedTalentResponse {
  id: string;
  userId: string;
  bio: string | null;
  skills: string[];
  isVerified: boolean;
  rating: number; // Returns real float representation to the frontend UI (e.g. 4.75)
  reviewCount: number;
  createdAt: string;
}

export class CatalogSerializer {
  /**
   * Sanitizes internal storage rows into public-facing talent summaries.
   */
  static formatTalentProfile(talent: TalentRow): SerializedTalentResponse {
    return {
      id: talent.id,
      userId: talent.userId,
      bio: talent.bio,
      skills: talent.skills,
      isVerified: talent.isVerified,
      rating: Number((talent.ratingCache / 100).toFixed(2)), // Transmutes the protected integer back to readable float formatting
      reviewCount: talent.reviewCountCache,
      createdAt: talent.createdAt.toISOString(),
    };
  }
}
