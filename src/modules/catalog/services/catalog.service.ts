import { eq, and, count } from "drizzle-orm";
import { db as defaultDb } from "@/shared/database/client";
import { ConflictError, NotFoundError } from "@/shared/errors/app-error";
import { cache } from "@/shared/cache/redis";
import { logger } from "@/shared/telemetry/logger";
import { CATALOG_CACHE, CATALOG_LIMITS } from "../catalog.constants";
import {
  categories,
  talents,
  portfolios,
  portfolioAttachments,
} from "../catalog.schema";
import { users } from "../../identity/identity.schema";
import { UpdateTalentProfilePayload } from "../request/update-talent.dto";
import { CreatePortfolioPayload } from "../request/create-portfolio.dto";
import { UpdatePortfolioPayload } from "../request/update-portfolio.dto";

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

  /**
   * provisions a new project showcase entry mapped onto a talent's seller profile workspace.
   * Processes nested attachment loops inside an atomic database transaction.
   *
   * @param {CreatePortfolioPayload} input - Sanitized application input package context metadata.
   * @param {DatabaseClient} [db=defaultDb] - Core database proxy connection instance lane.
   * @returns {Promise<any>} Materialized parent portfolio record structure.
   */
  static async createPortfolio(
    input: CreatePortfolioPayload,
    db: DatabaseClient = defaultDb,
  ) {
    return await db.transaction(async (tx) => {
      // 1. Guardrail Check: Aggregate total existing entries for this specific talent profile
      const [existingCountRow] = await tx
        .select({ value: count() })
        .from(portfolios)
        .where(eq(portfolios.talentId, input.talentId));

      const totalEntries = existingCountRow?.value ?? 0;

      if (totalEntries >= CATALOG_LIMITS.portfolio.maxEntries) {
        throw new ConflictError(
          `Portfolio limit reached. Maximum allowed is ${CATALOG_LIMITS.portfolio.maxEntries} showcase entries per talent profile.`,
        );
      }

      // 2. Commit the core project context row fields cleanly
      const [newPortfolio] = await tx
        .insert(portfolios)
        .values({
          talentId: input.talentId,
          title: input.title,
          description: input.description,
          externalLink: input.externalLink,
        })
        .returning();

      // 3. Short-circuit if caller did not provide any visual media items arrays
      if (!input.attachments || input.attachments.length === 0) {
        return {
          ...newPortfolio,
          attachments: [],
        };
      }

      // 4. Transform client array into database column parameters with incremental zero-indexed sortOrder tracks
      const operationalAttachmentsPayload = input.attachments.map(
        (item, index) => ({
          portfolioId: newPortfolio.id,
          mediaUrl: item.mediaUrl,
          mediaType: item.mediaType,
          sortOrder: index,
        }),
      );

      // 5. Batch inject rows inside the single transaction window loop
      const insertedAttachments = await tx
        .insert(portfolioAttachments)
        .values(operationalAttachmentsPayload)
        .returning();

      return {
        ...newPortfolio,
        attachments: insertedAttachments,
      };
    });
  }

  /**
   * Updates an existing portfolio entry after validating ownership constraints.
   * Leverages a transaction to handle atomic parent edits and child attachment array flushes.
   *
   * @param {UpdatePortfolioPayload} input - Sanitized application input context layout maps.
   * @param {DatabaseClient} [db=defaultDb] - Execution operational database connection baseline.
   * @returns {Promise<any>} The re-hydrated updated portfolio composite data structure object.
   * @throws {NotFoundError} If the target portfolio identifier is missing or doesn't belong to the talent.
   */
  static async updatePortfolio(
    input: UpdatePortfolioPayload,
    db: DatabaseClient = defaultDb,
  ) {
    return await db.transaction(async (tx) => {
      const updateData: Record<string, any> = {};
      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined)
        updateData.description = input.description;
      if (input.externalLink !== undefined)
        updateData.externalLink = input.externalLink;

      let updatedPortfolio: typeof portfolios.$inferSelect | undefined;

      // FIX: Only run the database update statement if there are columns to actually change
      if (Object.keys(updateData).length > 0) {
        const [record] = await tx
          .update(portfolios)
          .set(updateData)
          .where(
            and(
              eq(portfolios.id, input.portfolioId),
              eq(portfolios.talentId, input.talentId),
            ),
          )
          .returning();

        updatedPortfolio = record;
      } else {
        // If no parent columns changed, just fetch the existing record to verify ownership and identity
        updatedPortfolio = await tx.query.portfolios.findFirst({
          where: and(
            eq(portfolios.id, input.portfolioId),
            eq(portfolios.talentId, input.talentId),
          ),
        });
      }

      if (!updatedPortfolio) {
        throw new NotFoundError(
          "Target portfolio item profile does not exist or access is denied.",
        );
      }

      // 2. Cascade array syncing loop: If attachment field key is omitted, bypass flushing child collections
      if (input.attachments === undefined) {
        const currentAttachments = await tx
          .select()
          .from(portfolioAttachments)
          .where(eq(portfolioAttachments.portfolioId, input.portfolioId))
          .orderBy(portfolioAttachments.sortOrder);

        return {
          ...updatedPortfolio,
          attachments: currentAttachments,
        };
      }

      // 3. Purge existing attachments to reset historical layout records
      await tx
        .delete(portfolioAttachments)
        .where(eq(portfolioAttachments.portfolioId, input.portfolioId));

      if (input.attachments.length === 0) {
        return {
          ...updatedPortfolio,
          attachments: [],
        };
      }

      // 4. Transform and rebuild new attachment items arrays with freshly indexed sorting criteria weights
      const operationalAttachmentsPayload = input.attachments.map(
        (item, index) => ({
          portfolioId: updatedPortfolio!.id,
          mediaUrl: item.mediaUrl,
          mediaType: item.mediaType,
          sortOrder: index,
        }),
      );

      const insertedAttachments = await tx
        .insert(portfolioAttachments)
        .values(operationalAttachmentsPayload)
        .returning();

      return {
        ...updatedPortfolio,
        attachments: insertedAttachments,
      };
    });
  }

  /**
   * Destroys an existing portfolio entry along with its cascading media elements
   * after validating structural ownership constraints.
   *
   * @param {string} portfolioId - Target database entry identifier UUID.
   * @param {string} talentId - Requesting verified talent user context UUID.
   * @throws {NotFoundError} If the target item does not exist or ownership validation fails.
   */
  static async deletePortfolio(
    portfolioId: string,
    talentId: string,
    db: DatabaseClient = defaultDb,
  ): Promise<void> {
    const [deletedRecord] = await db
      .delete(portfolios)
      .where(
        and(
          eq(portfolios.id, portfolioId),
          eq(portfolios.talentId, talentId), // Strict ownership guardrail
        ),
      )
      .returning();

    if (!deletedRecord) {
      throw new NotFoundError(
        "Target portfolio item profile does not exist or access is denied.",
      );
    }
  }

  /**
   * Resolves all active portfolio showcase entries assigned to a specific talent account.
   * Leverages Drizzle Relational API to deep-hydrate nested attachment carousel sliders.
   *
   * @param {string} talentId - The unique seller/talent context UUID (users.id tracker).
   * @param {DatabaseClient} [db=defaultDb] - Relational context engine connection proxy.
   * @returns {Promise<any[]>} Array of raw parent portfolio models containing child attachment records.
   */
  static async getPortfoliosByTalentId(
    talentId: string,
    db: DatabaseClient = defaultDb,
  ) {
    return await db.query.portfolios.findMany({
      where: eq(portfolios.talentId, talentId),
      with: {
        attachments: {
          orderBy: (attachments, { asc }) => [asc(attachments.sortOrder)],
        },
      },
      orderBy: (portfolios, { desc }) => [desc(portfolios.createdAt)],
    });
  }

  /**
   * Resolves a single deep-hydrated portfolio project entry by its unique identifier.
   * Forces child multi-media attachments to return sequentially ordered by sort weights.
   *
   * @param {string} portfolioId - Target database entry identifier UUID.
   * @param {DatabaseClient} [db=defaultDb] - Relational connection proxy client instance.
   * @returns {Promise<any>} Relational parent row merged with sorted child attachments.
   * @throws {NotFoundError} If the targeted portfolio record does not exist in database storage.
   */
  static async getPortfolioById(
    portfolioId: string,
    db: DatabaseClient = defaultDb,
  ) {
    const record = await db.query.portfolios.findFirst({
      where: eq(portfolios.id, portfolioId),
      with: {
        attachments: {
          orderBy: (attachments, { asc }) => [asc(attachments.sortOrder)],
        },
      },
    });

    if (!record) {
      throw new NotFoundError(
        "Requested portfolio project showcase item does not exist.",
      );
    }

    return record;
  }
}
