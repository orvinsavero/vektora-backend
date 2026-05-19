import { talents } from "../identity.schema";
import { IDENTITY_LIMITS } from "../identity.constants";
import { z } from "zod";

/**
 * Inbound Request Validation Contract for Talent Upgrades.
 * Enforces field data types, string trimming, array limits, and item uniqueness
 * at the network perimeter prior to service execution layers.
 */
export const registerTalentSchema = z.object({
  userId: z.string().uuid("Invalid user ID format. Must be a valid UUID."),

  bio: z
    .string()
    .max(
      IDENTITY_LIMITS.bio.max,
      `Bio cannot exceed ${IDENTITY_LIMITS.bio.max} characters.`,
    )
    .optional(),

  /**
   * Validates array bounds and filters duplicates out of the incoming stream.
   * Leverages a preprocessing transform layer to maintain distinct data entries.
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

/** Inferred Type Representation of the Validated Talent Schema Payload. */
export type RegisterTalentPayload = z.infer<typeof registerTalentSchema>;

/** Extract Drizzle's internal database insertion schema model properties */
type ExtractedInsertModel = typeof talents.$inferInsert;

/**
 * Reusable Compile-Time Generic Type Constraint Utility.
 * Forces the TypeScript engine to evaluate whether Type T can be safely assigned to Type U.
 * Breaks compilation cleanly if structural variations break assignment rules.
 */
type AssertExtends<T extends U, U> = true;

/**
 * Strict Compile-Time Structural Dependency Validation.
 * Maps incoming validation keys against Drizzle's write layer constraints.
 * Leverages indexed access lookups to eliminate dead variable declarations and satisfy strict linters.
 */
export type EnforceDrizzleContract = AssertExtends<
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
