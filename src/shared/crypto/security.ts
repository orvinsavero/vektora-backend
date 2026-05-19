import argon2 from "argon2";
import { HASH_CONFIG } from "@/modules/identity/identity.constants";
import { ValidationError } from "@/shared/errors/app-error";

/**
 * Cryptographic Security and Identity Utility.
 * Encapsulates password processing and validation invariants behind a secure,
 * black-box abstraction boundary to eliminate side-channel exploit profiling.
 */
export class SecurityUtil {
  private static readonly MAX_PASSWORD_BYTES = 72;

  /**
   * Transforms a plain-text password into a secure cryptographic Argon2id hash.
   * Enforces strict sizing invariants prior to launching heavy computational work.
   */
  static async hashPassword(password: string): Promise<string> {
    if (Buffer.byteLength(password, "utf8") > this.MAX_PASSWORD_BYTES) {
      throw new ValidationError(
        "Password payload exceeds maximum safe security size boundary.",
      );
    }

    return argon2.hash(password, {
      type: argon2.argon2id,
      ...HASH_CONFIG,
    });
  }

  /**
   * Evaluates a raw plain-text string against an existing database hash signature.
   * Suppresses internal formatting and tracking errors to maintain absolute security opacity.
   *
   * @param {string} password - Raw inbound input token from a login attempt.
   * @param {string} hash - Extracted comparison signature target from persistence layers.
   * @returns {Promise<boolean>} True only if credentials pass exact cryptographic match parameters.
   */
  static async verifyPassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    // Fail-fast silently. Do not throw or leak state if parameters are missing.
    if (!password || !hash) {
      return false;
    }

    // Fail-fast silently if an attacker attempts an event loop starvation string attack
    if (Buffer.byteLength(password, "utf8") > this.MAX_PASSWORD_BYTES) {
      return false;
    }

    try {
      return await argon2.verify(hash, password);
    } catch {
      /**
       * Intercept library formatting faults or internal system errors silently.
       * Returning false guarantees that authentication routes preserve a uniform
       * output signature, shutting down timing and parameter profiling paths entirely.
       */
      return false;
    }
  }
}
