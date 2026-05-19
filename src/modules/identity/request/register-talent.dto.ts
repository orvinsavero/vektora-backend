import { talents } from "../identity.schema";
import { IDENTITY_LIMITS } from "../identity.constants";
import { z } from "zod";

/**
 * Inbound Network Request Validation Contract for Talent Upgrades.
 * Body payload strictly validates business parameters; identity is pulled from session tokens.
 */
export const registerTalentSchema = z.object({
  bio: z
    .string()
    .max(
      IDENTITY_LIMITS.bio.max,
      `Bio cannot exceed ${IDENTITY_LIMITS.bio.max} characters.`,
    )
    .optional(),

  /**
   * Validates array bounds and filters duplicates out of the incoming stream.
   */
  skills: z
    .array(
      z
        .string()
        .trim()
        .min(IDENTITY_LIMITS.skills.itemMin, "Skill name cannot be empty."),
    )
    .min(
      IDENTITY_LIMITS.skills.min,
      `At least ${IDENTITY_LIMITS.skills.min} skill is required.`,
    )
    .transform((items) => [...new Set(items)]), // Strips duplicate skill arrays at the boundary
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
