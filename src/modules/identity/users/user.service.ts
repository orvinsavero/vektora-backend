import { eq } from "drizzle-orm";
import { db as defaultDb } from "@/shared/database/client";
import { ConflictError } from "@/shared/errors/app-error";
import { Security } from "@/shared/crypto/security";
import { USER_CONTEXT } from "../identity.constants";
import { users } from "../identity.schema";
import { RegisterUserPayload } from "../_shared/request/register-user.dto";

type DatabaseClient = typeof defaultDb;

/**
 * Core Users Resource Storefront Entity Engine.
 * Responsible for handling identity records registration and table boundary validations.
 */
export class UserService {
  /**
   * Provisions a brand new application identity record. Enforces unique key boundaries.
   *
   * @param {RegisterUserPayload} input - Sanitized account signup parameters map.
   * @param {DatabaseClient} [db=defaultDb] - Execution database client proxy context.
   * @returns {Promise<typeof users.$inferSelect>} Freshly written database record.
   * @throws {ConflictError} If the email account string or username handles are taken.
   */
  static async registerUser(
    input: RegisterUserPayload,
    db: DatabaseClient = defaultDb,
  ) {
    // 1. Assert email uniqueness fence lines
    const existingEmail = await db.query.users.findFirst({
      where: eq(users.email, input.email),
    });

    if (existingEmail) {
      throw new ConflictError(
        "An account with this email address already exists.",
      );
    }

    // 2. Assert username string uniqueness fence lines
    const existingUsername = await db.query.users.findFirst({
      where: eq(users.username, input.username),
    });

    if (existingUsername) {
      throw new ConflictError(
        "This username string is already claimed by another user.",
      );
    }

    // 3. Compute structural cryptographic string mutations pass
    const derivedHash = await Security.hashPassword(input.password);

    // 4. Commit values packet row straight to database storage disks
    const [newUser] = await db
      .insert(users)
      .values({
        email: input.email,
        username: input.username,
        passwordHash: derivedHash,
        birthDate: input.birthDate,
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        currentContext: USER_CONTEXT.USER,
        isActive: true,
      })
      .returning();

    return newUser;
  }
}
