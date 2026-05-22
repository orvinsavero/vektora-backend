// src/modules/catalog/services/catalog.service.ts
import { db as defaultDb } from "@/shared/database/client";
import { talents } from "../catalog.schema";
import { users } from "../../identity/identity.schema";
import { ConflictError, NotFoundError } from "@/shared/errors/app-error";
import { eq } from "drizzle-orm";
import { cache } from "@/shared/cache/redis";

type DatabaseClient = typeof defaultDb;
type RegisterTalentInput = {
  userId: string;
  bio?: string;
  skills?: string[];
};

export class CatalogService {
  /**
   * Transitions a standard user identity node into a productized talent storefront record.
   * Updates core security context flags and evicts active session cache keys instantly.
   *
   * @param {Object} input - Structural parameter boundary package context.
   * @param {string} input.userId - The unique UUID target reference of the base user account.
   * @param {string} [input.bio] - Optional professional biography statement metadata.
   * @param {string[]} [input.skills] - Optional verified professional skill tag collections.
   * @param {DatabaseClient} [db=defaultDb] - Relational context link used to process atomic database execution passes.
   * @returns {Promise<typeof talents.$inferSelect>} Freshly materialized talent persistence row records.
   * @throws {NotFoundError} If the target user id does not exist in the relational persistence layers.
   * @throws {ConflictError} If the user handle is already registered as an active marketplace seller.
   */
  static async registerNewTalent(
    input: RegisterTalentInput,
    db: DatabaseClient = defaultDb,
  ) {
    // 1. Confirm target baseline user entity exists
    const userRow = await db.query.users.findFirst({
      where: eq(users.id, input.userId),
    });

    if (!userRow) {
      throw new NotFoundError("Target user account identity not found.");
    }

    // 2. Prevent duplicate account registrations
    const existingTalent = await db.query.talents.findFirst({
      where: eq(talents.userId, input.userId),
    });

    if (existingTalent) {
      throw new ConflictError(
        "This user identity is already configured as a seller profile.",
      );
    }

    // 3. Commit state transition transaction cleanly down onto database references
    const newTalent = await db.transaction(async (tx) => {
      const [insertedTalent] = await tx
        .insert(talents)
        .values({
          userId: input.userId,
          bio: input.bio || null,
          skills: input.skills || [],
          isVerified: false,
          ratingCache: 0,
          reviewCountCache: 0,
        })
        .returning();

      // Transform user's structural application context role to TALENT
      await tx
        .update(users)
        .set({ currentContext: "TALENT" })
        .where(eq(users.id, input.userId));

      return insertedTalent;
    });

    // 4. EVICTION FIREWALL: Clear the active token cache so the client picks up the context change instantly
    if (cache.isOpen) {
      cache.del(`session:active:${input.userId}`).catch(() => {});
    }

    return newTalent;
  }

  /**
   * Resolves a fully-hydrated talent record joined with user metadata attributes by user account primary ID.
   *
   * @param {Object} input - Structural parameter context framework.
   * @param {string} input.userId - Unique system user identity UUID tracking string.
   * @param {DatabaseClient} [db=defaultDb] - Active database client instance used to pipeline query operations.
   * @returns {Promise<{ talent: typeof talents.$inferSelect; user: typeof users.$inferSelect }> } Combined entity row model dataset.
   * @throws {NotFoundError} If the targeted user context doesn't exist or hasn't upgraded to a seller profile.
   */
  static async getTalentByUserId(
    input: { userId: string },
    db: DatabaseClient = defaultDb,
  ) {
    const records = await db
      .select()
      .from(talents)
      .where(eq(talents.userId, input.userId))
      .leftJoin(users, eq(talents.userId, users.id))
      .limit(1);

    const match = records[0];

    if (!match || !match.users || !match.talents) {
      throw new NotFoundError(
        "Requested marketplace talent storefront profile does not exist.",
      );
    }

    return {
      talent: match.talents,
      user: match.users,
    };
  }
}
