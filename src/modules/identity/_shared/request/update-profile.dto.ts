import { z } from "zod";
import { users } from "../../identity.schema";
import { IDENTITY_LIMITS } from "../../identity.constants";

/**
 * Inbound Request Validation Schema for Dynamic Profile Updates.
 * Marks every field as optional to allow partial updates without overwriting existing data.
 */
export const updateProfileSchema = z.object({
  firstName: z
    .string()
    .trim()
    .max(
      IDENTITY_LIMITS.firstName.max,
      `First name cannot exceed ${IDENTITY_LIMITS.firstName.max} characters.`,
    )
    .min(1, "First name cannot be empty if provided.")
    .optional(),

  lastName: z
    .string()
    .trim()
    .max(
      IDENTITY_LIMITS.lastName.max,
      `Last name cannot exceed ${IDENTITY_LIMITS.lastName.max} characters.`,
    )
    .min(1, "Last name cannot be empty if provided.")
    .optional(),

  birthDate: z
    .string()
    .date("Birth date must be a valid ISO format string (YYYY-MM-DD).")
    .optional(),

  avatarUrl: z
    .string()
    .trim()
    .url("Avatar URL must be a valid hyperlink.")
    .max(IDENTITY_LIMITS.avatarUrl.max, `Avatar URL path is too long.`)
    .optional(),

  language: z
    .string()
    .trim()
    .max(
      IDENTITY_LIMITS.language.max,
      `Language identifier code cannot exceed ${IDENTITY_LIMITS.language.max} characters.`,
    )
    .optional(),

  theme: z
    .string()
    .trim()
    .max(
      IDENTITY_LIMITS.theme.max,
      `Theme identifier state name cannot exceed ${IDENTITY_LIMITS.theme.max} characters.`,
    )
    .optional(),

  timezone: z
    .string()
    .trim()
    .max(
      IDENTITY_LIMITS.timezone.max,
      `Timezone region identifier path cannot exceed ${IDENTITY_LIMITS.timezone.max} characters.`,
    )
    .optional(),
});

/** Inferred Type Representation of the Validated Update Payload. */
export type UpdateProfilePayload = z.infer<typeof updateProfileSchema>;

/** Extract Drizzle's internal database insertion schema model properties */
type ExtractedInsertModel = typeof users.$inferInsert;

type AssertExtends<T extends U, U> = true;

/**
 * Strict Compile-Time Structural Dependency Validation.
 * Guarantees that our dynamic update keys safely target valid columns in the database.
 */
type EnforceDrizzleContract = AssertExtends<
  {
    firstName: UpdateProfilePayload["firstName"];
    lastName: UpdateProfilePayload["lastName"];
    avatarUrl: UpdateProfilePayload["avatarUrl"];
    language: UpdateProfilePayload["language"];
    theme: UpdateProfilePayload["theme"];
    timezone: UpdateProfilePayload["timezone"];
  },
  {
    firstName: ExtractedInsertModel["firstName"] | null | undefined;
    lastName: ExtractedInsertModel["lastName"] | null | undefined;
    avatarUrl: ExtractedInsertModel["avatarUrl"] | null | undefined;
    language: ExtractedInsertModel["language"] | undefined;
    theme: ExtractedInsertModel["theme"] | undefined;
    timezone: ExtractedInsertModel["timezone"] | undefined;
  }
>;
