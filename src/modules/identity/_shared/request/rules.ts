import { z } from "zod";
import { IDENTITY_LIMITS, REGISTRATION_RULES } from "../../identity.constants";

/**
 * Immutable Regular Expression Constraint Matrix.
 * Frozen via Object.freeze to protect execution definitions from memory-space drift.
 */
const REGEX_RULES = Object.freeze({
  USERNAME: /^[a-zA-Z0-9](?:[a-zA-Z0-9_-]*[a-zA-Z0-9])?$/,
  PASSWORD_COMPLEXITY:
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
});

/**
 * Timezone-Isolated Age Verification Utility.
 * Evaluates date parts arithmetically to bypass local system clock offsets.
 * Guarantees consistent validation regardless of host machine timezone.
 *
 * @param {string} birthDateString - Input format compliant with YYYY-MM-DD pattern constraints.
 * @param {number} minAge - Direct target floor integer representing age threshold.
 * @returns {boolean} True if age meets or exceeds target floor requirement.
 */
export function isMinimumAge(birthDateString: string, minAge: number): boolean {
  // Extract structural parts directly to completely bypass JavaScript UTC/Local offset conversions
  const parts = birthDateString.split("-");
  if (parts.length !== 3) return false;

  const birthYear = parseInt(parts[0], 10);
  const birthMonth = parseInt(parts[1], 10) - 1; // Align 0-indexed month models
  const birthDay = parseInt(parts[2], 10);

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentDay = today.getDate();

  let age = currentYear - birthYear;
  const monthDifference = currentMonth - birthMonth;

  if (monthDifference < 0 || (monthDifference === 0 && currentDay < birthDay)) {
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
    REGEX_RULES.USERNAME,
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
    REGEX_RULES.PASSWORD_COMPLEXITY,
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
