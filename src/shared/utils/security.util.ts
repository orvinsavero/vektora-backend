import argon2 from "argon2";
import { HASH_CONFIG } from "@/modules/identity/identity.constants";

export class SecurityUtil {
  /**
   * Transforms a plain-text password into a secure cryptographic Argon2id hash.
   */
  static async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: HASH_CONFIG.memoryCost,
      timeCost: HASH_CONFIG.timeCost,
      parallelism: HASH_CONFIG.parallelism,
    });
  }

  /**
   * Evaluates a raw plain-text string against an existing database hash signature.
   */
  static async verifyPassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      // Direct catch blocks return false on broken hash formatting or internal evaluation failures
      return false;
    }
  }
}
