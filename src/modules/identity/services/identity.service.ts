import { db, DbClient, DbTransaction } from "@/shared/database/client";
import { users, talents } from "../identity.schema";
import { or, eq, sql } from "drizzle-orm";
import { USER_CONTEXT } from "../identity.constants";
import { RegisterUserPayload } from "../request";
import { UnauthorizedError, ConflictError } from "@/shared/errors/app-error";
import { Security } from "@/shared/crypto/security";
import type { LoginPayload } from "../request/login.dto";

type UserRow = typeof users.$inferSelect;

/**
 * Identity Domain Core Service Engine.
 * Orchestrates atomic database writes, business constraints evaluation,
 * and secure credential verification workflows for user and talent entities.
 */
export class IdentityService {
  /**
   * Evaluates identity conflicts and provisions a new base user account profile.
   * Encrypts incoming passwords via Argon2id prior to database persistence.
   * * @param {RegisterUserPayload} payload - Validated request payload matching schema constraints.
   * @param {DbClient | DbTransaction} [client=db] - Optional execution context to support atomic transaction blocks.
   * @returns {Promise<UserRow>} Complete internal user record populated from the database write.
   * @throws {ConflictError} If the target email or username is already allocated within the persistence layer.
   */
  static async registerNewUser(
    payload: RegisterUserPayload,
    client: DbClient | DbTransaction = db,
  ): Promise<UserRow> {
    // 1. Intercept conflict threats across distinct unique indexes
    const conflictingUser = await client.query.users.findFirst({
      where: or(
        eq(users.email, payload.email),
        eq(users.username, payload.username),
      ),
    });

    if (conflictingUser) {
      if (conflictingUser.email === payload.email) {
        throw new ConflictError("This email address is already registered.");
      }
      if (conflictingUser.username === payload.username) {
        throw new ConflictError("This username is already taken.");
      }
    }

    // 2. Hash plain-text credentials prior to passing the layer boundary
    const passwordHash = await Security.hashPassword(payload.password);

    // 3. Commit the entity record cleanly to the target database context
    const [newUser] = await client
      .insert(users)
      .values({
        email: payload.email,
        username: payload.username,
        passwordHash,
        firstName: payload.firstName,
        lastName: payload.lastName,
        birthDate: payload.birthDate,
        avatarUrl: payload.avatarUrl,
        currentContext: USER_CONTEXT.USER,
      })
      .returning();

    return newUser;
  }

  /**
   * Authenticates user credentials against the current persistence layer data store.
   * Normalizes structural output errors to shield the server against brute-force timing profile attacks.
   * * @param {LoginPayload} payload - Unverified handle and credential strings from login request.
   * @param {DbClient | DbTransaction} [client=db] - Relational context driver to route the selection query pass.
   * @returns {Promise<UserRow>} Authenticated database user selection model.
   * @throws {UnauthorizedError} A uniform generic exception emitted if the user doesn't exist OR hash checks fail.
   */
  static async authenticateUser(
    payload: LoginPayload,
    client: DbClient | DbTransaction = db,
  ): Promise<UserRow> {
    const { usernameOrEmail, password } = payload;

    // 1. Locate the account record using either username or email matching targets
    const [user] = await client
      .select()
      .from(users)
      .where(
        or(
          eq(users.email, usernameOrEmail),
          eq(users.username, usernameOrEmail),
        ),
      )
      .limit(1);

    // 2. Fail-fast if handle lookup draws an empty array record
    if (!user) {
      throw new UnauthorizedError("Invalid credentials provided.");
    }

    // 3. Evaluate the incoming password parameters against the saved Argon2id signature hash
    const isPasswordValid = await Security.verifyPassword(
      password,
      user.passwordHash,
    );

    // 4. Fail-fast with identical exception parameters to eliminate side-channel entry leaks
    if (!isPasswordValid) {
      throw new UnauthorizedError("Invalid credentials provided.");
    }

    return user;
  }
}
