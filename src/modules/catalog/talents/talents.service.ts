import { eq } from "drizzle-orm";
import { db as defaultDb } from "@/shared/database/client";
import { cache } from "@/shared/cache/redis";
import { ConflictError, NotFoundError } from "@/shared/errors/app-error";
import { USER_CONTEXT } from "../../identity/identity.constants";
import { users } from "../../identity/identity.schema";
import { talents } from "../catalog.schema";
import { RegisterTalentPayload } from "../_shared/request/register-talent.dto";
import { UpdateTalentPayload } from "../_shared/request/update-talent.dto";

type DatabaseClient = typeof defaultDb;

/**
 * Talents Domain Core Service Engine.
 * Coordinates seller profiles, onboarding lifecycles, and professional capability portfolios.
 */
export class TalentsService {
  /**
   * Converts a baseline user identity node into a productized seller storefront profile.
   * Executes within an atomic database transaction block to guarantee referential constraint safety.
   *
   * @param {RegisterTalentPayload} input - Validated client upgrade requirements model parameters.
   * @param {DatabaseClient} [db=defaultDb] - Execution database pool instance context.
   * @returns {Promise<typeof talents.$inferSelect>} Freshly committed marketplace talent record.
   * @throws {NotFoundError} If the targeted user tracking UUID is missing from the database.
   * @throws {ConflictError} If the user has already registered a marketplace seller storefront.
   */
  static async registerNewTalent(
    input: RegisterTalentPayload,
    db: DatabaseClient = defaultDb,
  ) {
    return await db.transaction(async (tx) => {
      // 1. Confirm baseline account existence before mounting seller extensions
      const targetUser = await tx.query.users.findFirst({
        where: eq(users.id, input.userId),
      });

      if (!targetUser) {
        throw new NotFoundError("Target user account identity not found.");
      }

      // 2. Prevent profile data duplicates
      const existingTalent = await tx.query.talents.findFirst({
        where: eq(talents.userId, input.userId),
      });

      if (existingTalent) {
        throw new ConflictError(
          "This user identity is already configured as a seller profile.",
        );
      }

      // 3. Persist the seller metrics record layout
      const [newTalent] = await tx
        .insert(talents)
        .values({
          userId: input.userId,
          bio: input.bio,
          skills: input.skills,
        })
        .returning();

      // 4. Update core application context authorizations role flag to TALENT
      await tx
        .update(users)
        .set({ currentContext: USER_CONTEXT.TALENT })
        .where(eq(users.id, input.userId));

      // 5. Purge the session cache to force immediate middleware role re-evaluation
      if (cache.isOpen) {
        await cache.del(`session:active:${input.userId}`).catch(() => {});
      }

      return newTalent;
    });
  }

  /**
   * Resolves a fully-hydrated talent record left-joined with user identity attributes.
   *
   * @param {Object} input - Identity target payload wrapper.
   * @param {string} input.userId - Target identification tracker handle UUID.
   * @param {DatabaseClient} [db=defaultDb] - Relational context driver selection proxy link.
   * @returns {Promise<{ talent: typeof talents.$inferSelect; user: typeof users.$inferSelect }>} Combined structural dataset.
   * @throws {NotFoundError} If the target user lacks a configured marketplace storefront profile.
   */
  static async getTalentByUserId(
    input: { userId: string },
    db: DatabaseClient = defaultDb,
  ) {
    const talentRow = await db.query.talents.findFirst({
      where: eq(talents.userId, input.userId),
    });

    if (!talentRow) {
      throw new NotFoundError(
        "Requested marketplace talent storefront profile does not exist.",
      );
    }

    const userRow = await db.query.users.findFirst({
      where: eq(users.id, input.userId),
    });

    if (!userRow) {
      throw new NotFoundError(
        "Associated primary identity dataset record missing.",
      );
    }

    return { talent: talentRow, user: userRow };
  }

  /**
   * Dynamically mutates allowable showcase profile settings.
   * Automatically bypasses writing loops if incoming arguments pack is an empty json block.
   *
   * @param {string} userId - Requesting user unique identification tracking handle UUID string.
   * @param {UpdateTalentPayload} input - Whitelisted metadata parameters update packaging map.
   * @param {DatabaseClient} [db=defaultDb] - Execution operational transaction database scope.
   */
  static async updateTalentProfile(
    userId: string,
    input: UpdateTalentPayload,
    db: DatabaseClient = defaultDb,
  ) {
    const updateData: Record<string, any> = {};
    if (input.bio !== undefined) updateData.bio = input.bio;
    if (input.skills !== undefined) updateData.skills = input.skills;

    // Guard against running empty SQL queries
    if (Object.keys(updateData).length === 0) {
      const existingRecord = await db.query.talents.findFirst({
        where: eq(talents.userId, userId),
      });
      if (!existingRecord) {
        throw new NotFoundError(
          "Target marketplace talent profile does not exist.",
        );
      }
      return existingRecord;
    }

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
}
