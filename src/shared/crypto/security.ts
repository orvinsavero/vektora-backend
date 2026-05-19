import argon2 from "argon2";
import { SignJWT, jwtVerify } from "jose";
import { HASH_CONFIG } from "@/modules/identity/identity.constants";
import { ValidationError } from "@/shared/errors/app-error";

/**
 * Cryptographic Security and Identity Utility.
 * Encapsulates password processing and token validation invariants behind a secure,
 * black-box abstraction boundary to eliminate side-channel exploit profiling.
 */
export class Security {
  private static readonly MAX_PASSWORD_BYTES = 72;

  // Convert our environment secret string into an encoded byte matrix for the Web Crypto API
  private static readonly SECRET_KEY = new TextEncoder().encode(
    process.env.JWT_SECRET ||
      "fallback_unsecure_development_secret_key_change_me_in_prod",
  );

  /**
   * Transforms a plain-text password into a secure cryptographic Argon2id hash.
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
   */
  static async verifyPassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    if (!password || !hash) return false;
    if (Buffer.byteLength(password, "utf8") > this.MAX_PASSWORD_BYTES)
      return false;

    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  /**
   * Mints a state-free, cryptographically signed HS256 JSON Web Token.
   * Leverages the global Web Crypto API to ensure 100% compatibility across Edge Runtimes.
   * * @param {Record<string, unknown>} payload - Claims to embed inside the secure string.
   * @returns {Promise<string>} Web-standard token signature.
   */
  static async generateToken(
    payload: Record<string, unknown>,
  ): Promise<string> {
    return new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d") // Set ticket window life to 7 days matching cookie parameters
      .sign(this.SECRET_KEY);
  }

  /**
   * Validates a token signature string and decodes its inner data payload.
   * Throws errors if the signature is altered, expired, or malformed.
   * * @param {string} token - Raw authorization token sequence.
   */
  static async verifyToken<T = Record<string, unknown>>(
    token: string,
  ): Promise<T> {
    const { payload } = await jwtVerify(token, this.SECRET_KEY, {
      algorithms: ["HS256"],
    });
    return payload as T;
  }
}
