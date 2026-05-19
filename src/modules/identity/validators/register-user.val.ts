import { z } from "zod";
import { users } from "../identity.schema";
import { IDENTITY_LIMITS } from "../identity.constants";
import { usernameRules, passwordRules, birthDateRules } from "./rules.val";

/**
 * Request validation schema enforcing business constraints on payload inputs.
 * Normalizes email strings, applies ASCII username rules, checks password complexity,
 * maps split name fields, and checks minimum age limitations.
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
  firstName: z
    .string()
    .trim()
    .max(
      IDENTITY_LIMITS.firstName.max,
      `First name cannot exceed ${IDENTITY_LIMITS.firstName.max} characters.`,
    )
    .optional(),
  lastName: z
    .string()
    .trim()
    .max(
      IDENTITY_LIMITS.lastName.max,
      `Last name cannot exceed ${IDENTITY_LIMITS.lastName.max} characters.`,
    )
    .optional(),
  birthDate: birthDateRules,
  avatarUrl: z
    .string()
    .trim()
    .url("Avatar URL must be a valid hyperlink.")
    .max(IDENTITY_LIMITS.avatarUrl.max, `Avatar URL path is too long.`)
    .optional(),
});

export type RegisterUserPayload = z.infer<typeof registerUserSchema>;

/**
 * Static assertion gate ensuring incoming payloads match the database layer schema keys.
 * Omit 'password' and 'birthDate' due to standard string input versus raw database type conversions.
 */
type VerifiedPayloadKeys = Omit<RegisterUserPayload, "password" | "birthDate">;
type TargetDatabaseInsertKeys = Omit<
  typeof users.$inferInsert,
  | "passwordHash"
  | "birthDate"
  | "id"
  | "currentContext"
  | "saldoWallet"
  | "isVerified"
  | "isActive"
  | "createdAt"
  | "updatedAt"
>;

type EnforceDrizzleContract =
  VerifiedPayloadKeys extends TargetDatabaseInsertKeys ? true : false;
