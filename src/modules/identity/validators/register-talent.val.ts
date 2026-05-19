import { talents } from "../identity.schema";
import { IDENTITY_LIMITS } from "../identity.constants";
import { z } from "zod";

/**
 * Inbound request validation contract enforcing size constraints and layout primitives.
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
    ),
});

export type RegisterTalentPayload = z.infer<typeof registerTalentSchema>;

// Static assertion gate ensuring incoming payloads map validly into persistence-layer insert arguments
type EnforceDrizzleContract =
  RegisterTalentPayload extends typeof talents.$inferInsert ? true : false;
