import { z } from "zod";
import { IDENTITY_LIMITS, REGISTRATION_RULES } from "../identity.constants";

const usernameRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9_-]*[a-zA-Z0-9])?$/;
const passwordComplexityRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

/**
 * Pure utility function to calculate age and verify it meets a minimum floor restriction.
 * Fully decoupled from schemas for flexible use across services, analytics, or guards.
 */
export function isMinimumAge(birthDateString: string, minAge: number): boolean {
  const birthDate = new Date(birthDateString);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age >= minAge;
}

/**
 * Reusable dynamic username rule enforcing character matrix bounds.
 * Automatically handles trimming and lowercasing via native sequential Zod modifiers.
 */
export const usernameRules = z
  .string()
  .trim()
  .toLowerCase()
  .min(
    IDENTITY_LIMITS.username.min,
    `Username must be at least ${IDENTITY_LIMITS.username.min} characters long.`,
  )
  .max(
    IDENTITY_LIMITS.username.max,
    `Username cannot exceed ${IDENTITY_LIMITS.username.max} characters.`,
  )
  .regex(
    usernameRegex,
    "Username can only contain letters, numbers, underscores, or hyphens, and cannot start or end with a symbol.",
  );

/**
 * Reusable primitive validation boundary for identity password inputs.
 * Enforces dynamic size limits and complex cryptographic strength requirements.
 */
export const passwordRules = z
  .string()
  .min(
    IDENTITY_LIMITS.password.min,
    `Password must be at least ${IDENTITY_LIMITS.password.min} characters long.`,
  )
  .max(
    IDENTITY_LIMITS.password.max,
    `Password configuration cannot exceed ${IDENTITY_LIMITS.password.max} characters.`,
  )
  .regex(
    passwordComplexityRegex,
    "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).",
  );

/**
 * Reusable primitive validation boundary for identity birth date inputs.
 * Enforces standardized ISO date formatting strings and age eligibility rules.
 */
export const birthDateRules = z
  .string()
  .date("Birth date must be a valid ISO format string (YYYY-MM-DD).")
  .refine(
    (dateStr) => isMinimumAge(dateStr, REGISTRATION_RULES.minAgeRequired),
    `Registration denied. You do not meet the minimum age requirement of ${REGISTRATION_RULES.minAgeRequired} years old.`,
  );
