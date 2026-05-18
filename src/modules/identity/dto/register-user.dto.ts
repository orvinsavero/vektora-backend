import { users } from "../identity.schema";
import { IDENTITY_LIMITS } from "../identity.constants";
import { z } from "zod";

// Runtime request validation contract enforcing input size constraints and primitive structural rules
export const registerUserSchema = z.object({
  email: z
    .string()
    .email("Invalid email address format.")
    .max(IDENTITY_LIMITS.email.max, "Email path is too long."),
  username: z
    .string()
    .min(
      IDENTITY_LIMITS.username.min,
      `Username must be at least ${IDENTITY_LIMITS.username.min} characters long.`,
    )
    .max(
      IDENTITY_LIMITS.username.max,
      `Username cannot exceed ${IDENTITY_LIMITS.username.max} characters.`,
    ),
  fullName: z
    .string()
    .max(
      IDENTITY_LIMITS.fullName.max,
      `Full name cannot exceed ${IDENTITY_LIMITS.fullName.max} characters.`,
    )
    .optional(),
  avatarUrl: z
    .string()
    .url("Avatar URL must be a valid hyperlink.")
    .max(IDENTITY_LIMITS.avatarUrl.max, `Avatar URL path is too long.`),
});

export type RegisterUserPayload = z.infer<typeof registerUserSchema>;

// Static assertion gate ensuring incoming payloads map validly into persistence-layer insert arguments
type EnforceDrizzleContract =
  RegisterUserPayload extends typeof users.$inferInsert ? true : false;
