import { talents } from "../catalog.schema";
import { CATALOG_LIMITS } from "../catalog.constants";
import { z } from "zod";

/**
 * Inbound Network Request Validation Contract for Talent Upgrades.
 * Body payload strictly validates business parameters; identity is pulled from session tokens.
 */
export const registerTalentSchema = z.object({
  bio: z
    .string()
    .trim()
    .min(CATALOG_LIMITS.bio.min, "Biography statement cannot be empty.")
    .max(
      CATALOG_LIMITS.bio.max,
      `Biography cannot exceed ${CATALOG_LIMITS.bio.max} characters.`,
    ),

  skills: z
    .array(
      z
        .string()
        .trim()
        .min(
          CATALOG_LIMITS.skills.itemMin,
          `Each skill tag must be at least ${CATALOG_LIMITS.skills.itemMin} characters.`,
        )
        .max(
          CATALOG_LIMITS.skills.itemMax,
          `Each skill tag cannot exceed ${CATALOG_LIMITS.skills.itemMax} characters.`,
        ),
    )
    .min(
      CATALOG_LIMITS.skills.min,
      `Provide at least ${CATALOG_LIMITS.skills.min} professional skill tag.`,
    )
    .max(
      CATALOG_LIMITS.skills.max,
      `Maximum skill capacity capped at ${CATALOG_LIMITS.skills.max} tags.`,
    ),
});

/** Inferred Type Representation of the Validated Network Wire Payload. */
export type RegisterTalentNetworkInput = z.infer<typeof registerTalentSchema>;

/** * Expanded Business Context Interface.
 * Combines the validated client body with the authenticated session context.
 * This is what gets passed directly into IdentityService.registerAsTalent().
 */
export interface RegisterTalentPayload extends RegisterTalentNetworkInput {
  userId: string;
}

/** Extract Drizzle's internal database insertion schema model properties */
type ExtractedInsertModel = typeof talents.$inferInsert;

/** Reusable Compile-Time Generic Type Constraint Utility */
type AssertExtends<T extends U, U> = true;

/**
 * Strict Compile-Time Structural Dependency Validation.
 * Confirms our combined application input safely matches what Drizzle demands for database operations.
 */
type EnforceDrizzleContract = AssertExtends<
  {
    userId: RegisterTalentPayload["userId"];
    bio: RegisterTalentPayload["bio"];
    skills: RegisterTalentPayload["skills"];
  },
  {
    userId: ExtractedInsertModel["userId"];
    bio: ExtractedInsertModel["bio"] | null | undefined;
    skills: ExtractedInsertModel["skills"];
  }
>;
