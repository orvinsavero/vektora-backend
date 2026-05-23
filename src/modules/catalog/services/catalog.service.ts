// src/modules/catalog/services/catalog.service.ts
import { db as defaultDb } from "@/shared/database/client";
import { CATALOG_CACHE } from "../catalog.constants";
import { categories, talents } from "../catalog.schema";
import { users } from "../../identity/identity.schema";
import { UpdateTalentProfilePayload } from "../request/update-talent.dto";
import { ConflictError, NotFoundError } from "@/shared/errors/app-error";
import { eq } from "drizzle-orm";
import { cache } from "@/shared/cache/redis";
import { logger } from "@/shared/telemetry/logger";

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

  /**
   * Dynamically mutates a seller profile's allowable showcase configuration metrics.
   * Strips un-whitelisted properties to protect system caches from manual injection exploits.
   *
   * @param {string} userId - Target unique identification tracking handle UUID string.
   * @param {UpdateTalentProfilePayload} payload - Filtered profile modification parameters package map.
   * @param {DatabaseClient} [db=defaultDb] - Relational context engine used to process database routines.
   * @returns {Promise<typeof talents.$inferSelect>} Upgraded talent persistence row representation layout.
   * @throws {NotFoundError} If the targeted seller account storefront doesn't exist in storage.
   */
  static async updateTalentProfile(
    userId: string,
    payload: UpdateTalentProfilePayload,
    db: DatabaseClient = defaultDb,
  ) {
    const updateData: Record<string, any> = {};

    // Explicitly whitelist only client-managed mutations
    if (payload.bio !== undefined) updateData.bio = payload.bio;
    if (payload.skills !== undefined) updateData.skills = payload.skills;

    // Short-circuit operation if the payload collection is empty
    if (Object.keys(updateData).length === 0) {
      const existing = await db.query.talents.findFirst({
        where: eq(talents.userId, userId),
      });
      if (!existing) {
        throw new NotFoundError(
          "Target marketplace talent profile does not exist.",
        );
      }
      return existing;
    }

    // Force audit track timestamp renewal variables
    updateData.updatedAt = new Date();

    const [updatedTalent] = await db
      .update(talents)
      .set(updateData)
      .where(eq(talents.userId, userId))
      .returning();

    if (!updatedTalent) {
      throw new NotFoundError(
        "Target marketplace talent profile does not exist.",
      );
    }

    return updatedTalent;
  }

  /**
   * Resolves a flat array containing all active marketplace categories.
   * Leverages an asynchronous cache-aside mechanism to reduce primary database execution loads.
   *
   * @param {DatabaseClient} [db=defaultDb] - Relational connection driver instance context.
   * @returns {Promise<typeof categories.$inferSelect[]>} Array of raw category persistence rows.
   */
  static async getAllCategories(db: DatabaseClient = defaultDb) {
    const cacheKey = CATALOG_CACHE.keys.categoriesAll;

    // 1. Fast-Path: Safely evaluate memory state inside the operational Redis container
    if (cache.isOpen) {
      try {
        const cachedRawData = await cache.get(cacheKey);
        if (cachedRawData) {
          return JSON.parse(cachedRawData);
        }
      } catch (cacheError) {
        // Fail-open gracefully to preserve system uptime if Redis drops packets
        logger.warn(
          { err: cacheError },
          "CATALOG SERVICE CACHE WARNING: Failed reading category list from Redis.",
        );
      }
    }

    // 2. Cache-Miss: Fetch flat records from PostgreSQL, filtered by active flag status
    const liveCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(categories.name);

    // 3. Populate internal memory cache back asynchronously to preserve low network latency
    if (cache.isOpen && liveCategories.length > 0) {
      cache
        .set(cacheKey, JSON.stringify(liveCategories), {
          EX: CATALOG_CACHE.ttl,
        })
        .catch((writeError) => {
          logger.error(
            { err: writeError },
            "CATALOG SERVICE CACHE ERROR: Failed writing category list matrix to Redis.",
          );
        });
    }

    return liveCategories;
  }
}
