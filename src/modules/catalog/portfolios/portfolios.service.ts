import { and, eq, count } from "drizzle-orm";
import { db as defaultDb } from "@/shared/database/client";
import { ConflictError, NotFoundError } from "@/shared/errors/app-error";
import { portfolios, portfolioAttachments } from "../catalog.schema";
import { CATALOG_LIMITS } from "../catalog.constants";
import { CreatePortfolioPayload } from "../_shared/request/create-portfolio.dto";
import { UpdatePortfolioPayload } from "../_shared/request/update-portfolio.dto";

type DatabaseClient = typeof defaultDb;

/**
 * Portfolios Sub-Domain Lifecycle Service Engine.
 * Handles transactional CRUD operations for multi-media project showcases and attachment sliders.
 */
export class PortfoliosService {
  /**
   * Provisions a brand new media portfolio project container block.
   * Validates platform ceiling guardrails to reject spam past capacity rules.
   *
   * @param {CreatePortfolioPayload} input - Whitelisted metadata records payload package.
   * @param {DatabaseClient} [db=defaultDb] - Connection proxy driver instance lane.
   * @returns {Promise<any>} Parent record composite object joined with attachment row values.
   * @throws {ConflictError} If total entries already meet the ceiling maximum limits threshold.
   */
  static async createPortfolio(
    input: CreatePortfolioPayload,
    db: DatabaseClient = defaultDb,
  ) {
    return await db.transaction(async (tx) => {
      // 1. Ceiling Guardrail Gate Check
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

      // 2. Commit parent portfolio entry fields
      const [newPortfolio] = await tx
        .insert(portfolios)
        .values({
          talentId: input.talentId,
          title: input.title,
          description: input.description,
          externalLink: input.externalLink,
        })
        .returning();

      // 3. Short-circuit early if project lacks sub-resource visual items arrays
      if (!input.attachments || input.attachments.length === 0) {
        return { ...newPortfolio, attachments: [] };
      }

      // 4. Transform sub-resource array with zero-indexed frontend sort order parameters
      const operationalAttachmentsPayload: Array<
        typeof portfolioAttachments.$inferInsert
      > = input.attachments.map((item, index) => ({
        portfolioId: newPortfolio.id,
        mediaUrl: item.mediaUrl as string,
        mediaType:
          item.mediaType as typeof portfolioAttachments.$inferInsert.mediaType,
        sortOrder: index,
      }));

      // 5. Batch inject rows inside the isolated transaction pass
      const insertedAttachments = await tx
        .insert(portfolioAttachments)
        .values(operationalAttachmentsPayload)
        .returning();

      return { ...newPortfolio, attachments: insertedAttachments };
    });
  }

  /**
   * Modifies text properties and synchronizes the attached multi-media asset lists.
   * Uses a full purge-and-reinsert routine to reset historical layout slots cleanly.
   *
   * @param {UpdatePortfolioPayload} input - Sanitized application update layout maps.
   * @param {DatabaseClient} [db=defaultDb] - Connection operational baseline.
   * @returns {Promise<any>} Deeply re-hydrated updated composite snapshot object.
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

      // 1. Only query table modifications if textual changes are present
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
        // Fallback pass to verify record state ownership match parameters
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

      // 2. Short-circuit sub-resource syncing if media arrays parameters are omitted
      if (input.attachments === undefined) {
        const currentAttachments = await tx
          .select()
          .from(portfolioAttachments)
          .where(eq(portfolioAttachments.portfolioId, input.portfolioId))
          .orderBy(portfolioAttachments.sortOrder);

        return { ...updatedPortfolio, attachments: currentAttachments };
      }

      // 3. Atomically drop old attachments metrics cards loops
      await tx
        .delete(portfolioAttachments)
        .where(eq(portfolioAttachments.portfolioId, input.portfolioId));

      if (input.attachments.length === 0) {
        return { ...updatedPortfolio, attachments: [] };
      }

      // 4. Append fresh replacements using fresh sequential arrays map indexing
      const operationalAttachmentsPayload: Array<
        typeof portfolioAttachments.$inferInsert
      > = input.attachments.map((item, index) => ({
        portfolioId: updatedPortfolio!.id,
        mediaUrl: item.mediaUrl as string,
        mediaType:
          item.mediaType as typeof portfolioAttachments.$inferInsert.mediaType,
        sortOrder: index,
      }));

      const insertedAttachments = await tx
        .insert(portfolioAttachments)
        .values(operationalAttachmentsPayload)
        .returning();

      return { ...updatedPortfolio, attachments: insertedAttachments };
    });
  }

  /**
   * Resolves an individual deep portfolio showcase record matching an identifier tracking key.
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

  /**
   * Resolves a flat listing of all published project container summaries assigned to a talent profile.
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
   * Destroys an explicit portfolio entry.
   * Leverages cascade rules to clear out database storage rows cleanly across joined attachments.
   */
  static async deletePortfolio(
    portfolioId: string,
    talentId: string,
    db: DatabaseClient = defaultDb,
  ): Promise<void> {
    const [deletedRecord] = await db
      .delete(portfolios)
      .where(
        and(eq(portfolios.id, portfolioId), eq(portfolios.talentId, talentId)),
      )
      .returning();

    if (!deletedRecord) {
      throw new NotFoundError(
        "Target portfolio item profile does not exist or access is denied.",
      );
    }
  }
}
