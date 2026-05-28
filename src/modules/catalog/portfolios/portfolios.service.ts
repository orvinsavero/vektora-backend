import { and, eq, count, notInArray } from "drizzle-orm";
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
      // 1. Update text properties (Atomic operation)
      const updateData = {
        title: input.title,
        description: input.description,
        externalLink: input.externalLink,
      };

      // Clean updateData object by removing undefined values
      Object.keys(updateData).forEach(
        (key) =>
          (updateData as any)[key] === undefined &&
          delete (updateData as any)[key],
      );

      let updatedPortfolio: typeof portfolios.$inferSelect | undefined;

      if (Object.keys(updateData).length > 0) {
        [updatedPortfolio] = await tx
          .update(portfolios)
          .set(updateData)
          .where(
            and(
              eq(portfolios.id, input.portfolioId),
              eq(portfolios.talentId, input.talentId),
            ),
          )
          .returning();
      } else {
        updatedPortfolio = await tx.query.portfolios.findFirst({
          where: and(
            eq(portfolios.id, input.portfolioId),
            eq(portfolios.talentId, input.talentId),
          ),
        });
      }

      if (!updatedPortfolio) {
        throw new NotFoundError(
          "Target portfolio item profile does not exist.",
        );
      }

      // 2. Handle Attachment Diffing (ONLY if attachments are provided)
      if (input.attachments !== undefined) {
        const incoming = input.attachments;
        const incomingIds = incoming
          .map((a) => a.id)
          .filter((id): id is string => !!id);

        // A. DELETE: Remove attachments belonging to this portfolio that ARE NOT in the new list
        // This is more efficient than doing it in JS memory
        await tx
          .delete(portfolioAttachments)
          .where(
            and(
              eq(portfolioAttachments.portfolioId, input.portfolioId),
              incomingIds.length > 0
                ? notInArray(portfolioAttachments.id, incomingIds)
                : undefined,
            ),
          );

        // B. UPSERT: Update existing or Insert new
        for (const [index, item] of incoming.entries()) {
          if (item.id) {
            // Update existing
            await tx
              .update(portfolioAttachments)
              .set({
                mediaUrl: item.mediaUrl,
                mediaType: item.mediaType,
                sortOrder: index,
              })
              .where(eq(portfolioAttachments.id, item.id));
          } else {
            // Insert new
            await tx.insert(portfolioAttachments).values({
              portfolioId: updatedPortfolio.id,
              mediaUrl: item.mediaUrl,
              mediaType: item.mediaType,
              sortOrder: index,
            });
          }
        }
      }

      // 3. Return re-hydrated state
      const finalAttachments = await tx
        .select()
        .from(portfolioAttachments)
        .where(eq(portfolioAttachments.portfolioId, updatedPortfolio.id))
        .orderBy(portfolioAttachments.sortOrder);

      return { ...updatedPortfolio, attachments: finalAttachments };
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
