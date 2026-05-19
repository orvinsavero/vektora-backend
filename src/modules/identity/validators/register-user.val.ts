import { z } from "zod";
import { users } from "../identity.schema";
import { IDENTITY_LIMITS } from "../identity.constants";
import { usernameRules, passwordRules, birthDateRules } from "./rules.val";

/**
 * Inbound Request Validation Contract for User Profiles.
 * Sanitizes emails, forces character restrictions, rejects empty optional strings,
 * and executes age calculation validations at the network boundary perimeter.
 */
export const registerUserSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email address format.")
    .max(IDENTITY_LIMITS.email.max, "Email path is too long."),

  username: usernameRules,

  password: passwordRules,

  /**
   * Transforms empty inputs or pure whitespace sequences into clear null primitives.
   * This guarantees clean SQL NULL writes rather than empty string pollution.
   */
  firstName: z
    .string()
    .trim()
    .max(
      IDENTITY_LIMITS.firstName.max,
      `First name cannot exceed ${IDENTITY_LIMITS.firstName.max} characters.`,
    )
    .min(1, "First name cannot be empty if provided.")
    .nullable()
    .optional()
    .transform((val) => val || null),

  lastName: z
    .string()
    .trim()
    .max(
      IDENTITY_LIMITS.lastName.max,
      `Last name cannot exceed ${IDENTITY_LIMITS.lastName.max} characters.`,
    )
    .min(1, "Last name cannot be empty if provided.")
    .nullable()
    .optional()
    .transform((val) => val || null),

  birthDate: birthDateRules,

  /**
   * Optional Profile Asset Hyperlink.
   * Keeps the value as 'undefined' if omitted from the inbound wire payload buffer.
   * This allows the persistence layer to cleanly trigger its native column default strings.
   */
  avatarUrl: z
    .string()
    .trim()
    .url("Avatar URL must be a valid hyperlink.")
    .max(IDENTITY_LIMITS.avatarUrl.max, `Avatar URL path is too long.`)
    .optional(),
});

/** Inferred Type Representation of the Validated User Registration Payload. */
export type RegisterUserPayload = z.infer<typeof registerUserSchema>;

/** Extract Drizzle's internal database insertion schema model properties */
type ExtractedInsertModel = typeof users.$inferInsert;

/**
 * Reusable Compile-Time Generic Type Constraint Utility.
 * Forces the TypeScript engine to evaluate whether Type T can be safely assigned to Type U.
 * Breaks compilation cleanly if structural variations break assignment rules.
 */
type AssertExtends<T extends U, U> = true;

/**
 * Strict Compile-Time Structural Dependency Validation.
 * Maps incoming validation keys against Drizzle's write layer constraints.
 * Leverages indexed access lookups to cleanly absorb volatile database driver anomalies.
 */
type EnforceDrizzleContract = AssertExtends<
  {
    email: RegisterUserPayload["email"];
    username: RegisterUserPayload["username"];
    firstName: RegisterUserPayload["firstName"];
    lastName: RegisterUserPayload["lastName"];
    avatarUrl: RegisterUserPayload["avatarUrl"];
  },
  {
    email: ExtractedInsertModel["email"];
    username: ExtractedInsertModel["username"];
    firstName: ExtractedInsertModel["firstName"] | null;
    lastName: ExtractedInsertModel["lastName"] | null;
    avatarUrl: ExtractedInsertModel["avatarUrl"] | null | undefined;
  }
>;
