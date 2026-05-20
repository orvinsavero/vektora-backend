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

type AssertExtends<T extends U, U> = true;

/**
 * Strict Compile-Time Structural Serialization Contract.
 * Guarantees that if catalog table columns shift, the serialization structure breaks compilation instantly.
 */
type EnforceTalentSerializerContract = AssertExtends<
  {
    [K in keyof SerializedTalentResponse]: SerializedTalentResponse[K];
  },
  {
    id: TalentRow["id"];
    userId: TalentRow["userId"];
    bio: TalentRow["bio"];
    skills: TalentRow["skills"];
    isVerified: TalentRow["isVerified"];
    createdAt: string; // ISO string cast output
    updatedAt: string; // ISO string cast output
  }
>;

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
