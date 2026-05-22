// src/modules/identity/services/identity.service.ts
import { or, eq, sql } from "drizzle-orm";
import { db, DbClient, DbTransaction } from "@/shared/database/client";
import {
  UnauthorizedError,
  ConflictError,
  NotFoundError,
} from "@/shared/errors/app-error";
import { Security } from "@/shared/crypto/security";
import { cache } from "@/shared/cache/redis";
import {
  RegisterUserPayload,
  UpdateProfilePayload,
  LoginPayload,
  UpdateAccountPayload,
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
   * * @param {Object} payload - Validated request registration payload matching schema constraints.
   * @param {string} payload.email - Unique authoritative email reference communication key.
   * @param {string} payload.username - System user identity moniker handle tracking string.
   * @param {string} payload.password - Cleartext password token subject to cryptographic salt hashing.
   * @param {string} [payload.firstName] - Optional first name personal parameter string.
   * @param {string} [payload.lastName] - Optional last name personal parameter string.
   * @param {string} payload.birthDate - Strict compliance verification date string (YYYY-MM-DD format).
   * @param {string} [payload.avatarUrl] - Optional cloud object storage profile photo reference link.
   * @param {DbClient | DbTransaction} [client=db] - Execution database driver fallback instance context.
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
   * * @param {Object} payload - Unverified identification target and verification strings.
   * @param {string} payload.usernameOrEmail - Unique system registration handle entry or targeted network email.
   * @param {string} payload.password - Unchecked cleartext authentication password challenge payload.
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
   * * @param {string} targetUserId - The unique identifier UUID of the user to look up.
   * @param {DbClient | DbTransaction} [client=db] - The database context proxy link instance.
   * @returns {Promise<UserRow>} Relational user entity overview block matching target query criteria.
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
   * * @param {string} userId - Target unique identification tracking handle UUID string.
   * @param {Object} payload - Filtered update profile updates map whitelisted from the API boundary.
   * @param {string} [payload.firstName] - Target replacement parameter value for first name.
   * @param {string} [payload.lastName] - Target replacement parameter value for last name.
   * @param {string} [payload.birthDate] - Target replacement parameter value for birth date.
   * @param {string} [payload.avatarUrl] - Target replacement parameter value for client avatar URL asset.
   * @param {string} [payload.language] - Target language localization metadata configuration parameters.
   * @param {string} [payload.theme] - Target interface look and feel UI display token identifier.
   * @param {string} [payload.timezone] - Target region location offset primitive tracking name.
   * @param {DbClient | DbTransaction} [client=db] - Execution database connection environment baseline.
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

  /**
   * Modifies critical authentication elements after enforcing strict unique collisions gates.
   * Evicts active caching spaces cleanly if structural tokens alter.
   * * @param {string} userId - Target authoritative unique account identification handle proxy UUID.
   * @param {Object} payload - Protected credential elements package map context.
   * @param {string} [payload.email] - Replacement validation target email address string payload.
   * @param {string} [payload.username] - Replacement system uniqueness profile moniker moniker token.
   * @param {string} [payload.password] - Replacement raw password cleartext target string.
   * @param {DbClient | DbTransaction} [client=db] - Execution operational transaction database scope.
   * @returns {Promise<UserRow>} Upgraded user database persistence record row layout.
   * @throws {ConflictError} If individual structural changes conflict with alternative user allocations.
   * @throws {NotFoundError} If target tracking parameters map back onto dead account records.
   */
  static async updateAccountCredentials(
    userId: string,
    payload: UpdateAccountPayload,
    client: DbClient | DbTransaction = db,
  ): Promise<UserRow> {
    const updateData: Record<string, any> = {};

    // 1. Handle Email Conflict Checks
    if (payload.email) {
      const existingEmail = await client.query.users.findFirst({
        where: eq(users.email, payload.email),
      });
      if (existingEmail && existingEmail.id !== userId) {
        throw new ConflictError("This email address is already in use.");
      }
      updateData.email = payload.email;
    }

    // 2. Handle Username Conflict Checks
    if (payload.username) {
      const existingUsername = await client.query.users.findFirst({
        where: eq(users.username, payload.username),
      });
      if (existingUsername && existingUsername.id !== userId) {
        throw new ConflictError("This username is already taken.");
      }
      updateData.username = payload.username;
    }

    // 3. Re-hash Password Buffers securely if targeted
    if (payload.password) {
      updateData.passwordHash = await Security.hashPassword(payload.password);
    }

    if (Object.keys(updateData).length === 0) {
      return this.getUserProfileById(userId, client);
    }

    updateData.updatedAt = sql`now()`;

    const [updatedUser] = await client
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      throw new NotFoundError("Target user profile does not exist.");
    }

    // 4. EVICT CACHE IMMEDIATELY: Forces auth-guard to instantly map fresh state
    if (cache.isOpen) {
      cache.del(`session:active:${userId}`).catch(() => {});
    }

    return updatedUser;
  }
}
