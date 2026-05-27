import { eq, and, ne } from "drizzle-orm";
import { db as defaultDb } from "@/shared/database/client";
import { cache } from "@/shared/cache/redis";
import { NotFoundError, ConflictError } from "@/shared/errors/app-error";
import { Security } from "@/shared/crypto/security";
import { users } from "../identity.schema";
import { UpdateAccountPayload } from "../_shared/request/update-account.dto";
import { UpdateProfilePayload } from "../_shared/request/update-profile.dto";

type DatabaseClient = typeof defaultDb;

/**
 * Account Profiles Self-Service Personalization Engine.
 */
export class AccountService {
  /**
   * Resolves the current profile state for a verified user session context.
   *
   * @param {string} userId - Requesting user unique identification handle UUID.
   * @param {DatabaseClient} [db=defaultDb] - Execution database pool instance context.
   * @returns {Promise<typeof users.$inferSelect>} Freshly resolved database record row.
   * @throws {NotFoundError} If the targeted user UUID is missing or inactive.
   */
  static async getProfile(userId: string, db: DatabaseClient = defaultDb) {
    const record = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!record || !record.isActive) {
      throw new NotFoundError("Authenticated user account data not found.");
    }

    return record;
  }

  /**
   * Modifies descriptive personal display metadata elements.
   */
  static async updateProfile(
    userId: string,
    input: UpdateProfilePayload,
    db: DatabaseClient = defaultDb,
  ) {
    const updatePayload: Record<string, any> = {};
    if (input.firstName !== undefined)
      updatePayload.firstName = input.firstName;
    if (input.lastName !== undefined) updatePayload.lastName = input.lastName;

    if (Object.keys(updatePayload).length === 0) {
      const record = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });
      if (!record)
        throw new NotFoundError("Target user profile container missing.");
      return record;
    }

    const [updated] = await db
      .update(users)
      .set(updatePayload)
      .where(eq(users.id, userId))
      .returning();
    if (!updated)
      throw new NotFoundError("Target user profile container missing.");

    if (cache.isOpen)
      await cache.del(`session:active:${userId}`).catch(() => {});
    return updated;
  }

  static async updateAccount(
    userId: string,
    input: UpdateAccountPayload,
    db: DatabaseClient = defaultDb,
  ) {
    const updatePayload: Record<string, any> = {};

    // 1. Handle Email updates with uniqueness check
    if (input.email !== undefined) {
      const existing = await db.query.users.findFirst({
        where: and(eq(users.email, input.email), ne(users.id, userId)),
      });
      if (existing) throw new ConflictError("Email already in use.");
      updatePayload.email = input.email;
    }

    // 2. FIX: Handle Username updates with uniqueness check
    if (input.username !== undefined) {
      const existing = await db.query.users.findFirst({
        where: and(eq(users.username, input.username), ne(users.id, userId)),
      });
      if (existing) throw new ConflictError("Username already in use.");
      updatePayload.username = input.username;
    }

    // 3. Handle Password updates (always hash it!)
    if (input.password !== undefined && input.password.trim() !== "") {
      updatePayload.passwordHash = await Security.hashPassword(input.password);
    }

    // Perform database commit if any fields were actually mapped
    if (Object.keys(updatePayload).length === 0) {
      const record = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });
      if (!record)
        throw new NotFoundError("Target user profile container missing.");
      return record;
    }

    const [updated] = await db
      .update(users)
      .set(updatePayload)
      .where(eq(users.id, userId))
      .returning();

    if (!updated)
      throw new NotFoundError("Target user profile container missing.");

    // Evict cache to force re-fetch of fresh account data
    if (cache.isOpen)
      await cache.del(`session:active:${userId}`).catch(() => {});

    return updated;
  }
}
