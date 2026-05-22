// src/modules/catalog/response/catalog.serializer.ts
import { talents } from "../catalog.schema";
import { users } from "../../identity/identity.schema";

type TalentRow = typeof talents.$inferSelect;
type UserRow = typeof users.$inferSelect;

/**
 * Combined Public Data Contract representing a completely hydrated seller presence.
 * Merges system user specifications with seller metrics for frontend layout consumption.
 */
export interface SerializedTalentDetailResponse {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bio: string | null;
  skills: string[];
  isVerified: boolean;
  rating: number; // Sanitized decimal representation (e.g. 4.75)
  reviewCount: number;
  joinedAt: string;
}

export interface SerializedTalentResponse {
  id: string;
  userId: string;
  bio: string | null;
  skills: string[];
  isVerified: boolean;
  rating: number;
  reviewCount: number;
  createdAt: string;
}

export class CatalogSerializer {
  /**
   * Sanitizes internal database rows into plain public-facing talent summaries.
   * Maps to: POST /api/catalog/register-talent
   *
   * @param {TalentRow} talent - Source raw database talent identity row reference.
   * @returns {SerializedTalentResponse} Lean client-facing initialization parameters object.
   */
  static formatTalentProfile(talent: TalentRow): SerializedTalentResponse {
    return {
      id: talent.id,
      userId: talent.userId,
      bio: talent.bio,
      skills: talent.skills,
      isVerified: talent.isVerified,
      rating: Number((talent.ratingCache / 100).toFixed(2)),
      reviewCount: talent.reviewCountCache,
      createdAt: talent.createdAt.toISOString(),
    };
  }

  /**
   * Flattens a relational database leftJoin composite row map into a single unified wire payload wrapper.
   * Maps to: GET /api/catalog/talent/[id], GET /api/catalog/talent/me
   *
   * @param {TalentRow} talent - Source raw database talent record row tracking credentials.
   * @param {UserRow} user - Associated parent system identity entry tracking parameters.
   * @returns {SerializedTalentDetailResponse} Completely flattened, type-safe profile wire response contract.
   */
  static formatTalentDetail(
    talent: TalentRow,
    user: UserRow,
  ): SerializedTalentDetailResponse {
    return {
      id: talent.id,
      userId: talent.userId,
      username: user.username,
      displayName:
        `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
        user.username,
      avatarUrl: user.avatarUrl,
      bio: talent.bio,
      skills: talent.skills,
      isVerified: talent.isVerified,
      rating: Number((talent.ratingCache / 100).toFixed(2)),
      reviewCount: talent.reviewCountCache,
      joinedAt: talent.createdAt.toISOString(),
    };
  }
}
