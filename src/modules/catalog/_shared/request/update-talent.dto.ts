import { z } from "zod";
import { CATALOG_LIMITS } from "../../catalog.constants";

/**
 * Inbound Request Validation Schema for Partial Talent Storefront Modifications.
 * Marks fields as optional to allow fluid partial updates while filtering anomalies.
 */
export const updateTalentProfileSchema = z.object({
  bio: z
    .string()
    .trim()
    .min(
      CATALOG_LIMITS.bio.min,
      "Biography statement cannot be empty if provided.",
    )
    .max(
      CATALOG_LIMITS.bio.max,
      `Biography cannot exceed ${CATALOG_LIMITS.bio.max} characters.`,
    )
    .optional(),
  skills: z
    .array(
      z
        .string()
        .trim()
        .min(
          CATALOG_LIMITS.skills.itemMin,
          `Each skill tag must be at least ${CATALOG_LIMITS.skills.itemMin} character.`,
        )
        .max(
          CATALOG_LIMITS.skills.itemMax,
          `Each skill tag cannot exceed ${CATALOG_LIMITS.skills.itemMax} characters.`,
        ),
    )
    .min(
      CATALOG_LIMITS.skills.min,
      `Provide at least ${CATALOG_LIMITS.skills.min} professional skill tag if updating.`,
    )
    .max(
      CATALOG_LIMITS.skills.max,
      `Maximum skill capacity capped at ${CATALOG_LIMITS.skills.max} tags.`,
    )
    .optional(),
});

// FIX: Rename this export to match your service layer expectations
export type UpdateTalentPayload = z.infer<typeof updateTalentProfileSchema>;
