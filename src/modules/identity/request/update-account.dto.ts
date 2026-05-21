import { z } from "zod";
import { IDENTITY_LIMITS } from "../identity.constants";
import { usernameRules, passwordRules } from "./rules";

/**
 * Request Validation Schema for Sensitive Credential Modifications.
 */
export const updateAccountSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Invalid email address format.")
      .max(IDENTITY_LIMITS.email.max, "Email path is too long.")
      .optional(),

    username: usernameRules.optional(),

    password: passwordRules.optional(),
  })
  .refine((data) => data.email || data.username || data.password, {
    message:
      "Provide at least one credential field to modify (email, username, or password).",
  });

export type UpdateAccountPayload = z.infer<typeof updateAccountSchema>;
