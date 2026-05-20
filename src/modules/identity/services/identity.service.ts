import { or, eq, sql } from "drizzle-orm";
import { db, DbClient, DbTransaction } from "@/shared/database/client";
import {
  UnauthorizedError,
  ConflictError,
  NotFoundError,
} from "@/shared/errors/app-error";
import { Security } from "@/shared/crypto/security";
import {
  RegisterUserPayload,
  UpdateProfilePayload,
  LoginPayload,
} from "../request";
import { users } from "../identity.schema";
import {
  USER_CONTEXT,
  ALLOWED_PROFILE_UPDATE_KEYS,
} from "../identity.constants";

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

  /**
   * Resolves an active user profile entity via its primary unique ID.
   * @param targetUserId The unique UUID of the user to look up.
   * @param client The database client instance (defaults to global pool).
   * @throws {NotFoundError} If the targeted user record does not exist.
   */
  static async getUserProfileById(
    targetUserId: string,
    client: DbClient | DbTransaction = db,
  ): Promise<UserRow> {
    const [user] = await client
      .select()
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    if (!user) {
      throw new NotFoundError("Requested user account profile does not exist.");
    }

    return user;
  }

  /**
   * Dynamically mutates an existing user profile's allowable metadata parameters.
   * Automatically strips undefined keys to protect against partial data loss.
   * @param {string} userId - Target unique identification tracking handle.
   * @param {UpdateProfilePayload} payload - Filtered update fields whitelisted from the API boundary.
   * @param {DbClient | DbTransaction} client - Execution database link context.
   * @returns {Promise<UserRow>} Enriched database mutation row outcome.
   * @throws {NotFoundError} If the targeted user record is non-existent.
   */
  static async updateUserProfile(
    userId: string,
    payload: UpdateProfilePayload,
    client: DbClient | DbTransaction = db,
  ): Promise<UserRow> {
    // Explicit extraction matching our approved client-side metadata whitelist
    const updateData = ALLOWED_PROFILE_UPDATE_KEYS.reduce(
      (acc, key) => {
        if (payload[key] !== undefined) {
          acc[key] = payload[key] as any;
        }
        return acc;
      },
      {} as Record<string, any>,
    );

    // Short-circuit operational execution if caller submits an empty JSON container
    if (Object.keys(updateData).length === 0) {
      const [existingUser] = await client
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!existingUser) {
        throw new NotFoundError("Target user profile does not exist.");
      }
      return existingUser;
    }

    // Force system control over audit tracks
    updateData.updatedAt = sql`now()`;

    const [updatedUser] = await client
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      throw new NotFoundError("Target user profile does not exist.");
    }

    return updatedUser;
  }
}
