import { z } from "zod";
import { usernameRules, passwordRules } from "./rules";

/**
 * Inbound Request Validation Contract for User Authentication.
 * Sanitizes the username/email field and prepares it for credentials checking.
 */
export const loginSchema = z.object({
  // Accept username or email under a unified handle token
  usernameOrEmail: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Username or email is required."),
  password: passwordRules,
});

export type LoginPayload = z.infer<typeof loginSchema>;
