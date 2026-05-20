import { db, DbClient, DbTransaction } from "@/shared/database/client";
import { talents } from "../catalog.schema";
import { users } from "../../identity/identity.schema";
import { eq, sql } from "drizzle-orm";
import { USER_CONTEXT } from "../../identity/identity.constants";
import { RegisterTalentPayload } from "../../catalog/request/register-talent.dto";
import { ConflictError, NotFoundError } from "@/shared/errors/app-error";
import { logger } from "@/shared/telemetry/logger";

type TalentRow = typeof talents.$inferSelect;

/**
 * Catalog Domain Core Service Engine.
 * Manages marketplace inventory creation, seller profile states, and asset lookups.
 */
export class CatalogService {
  /**
   * Converts an active, existing user profile into a marketplace talent account matrix.
   * Executes multi-table adjustments inside the provided relational context.
   * * @param {RegisterTalentPayload} payload - Validated profile configuration values.
   * @param {DbClient | DbTransaction} [client=db] - Optional execution context to safeguard atomic write pools.
   * @returns {Promise<TalentRow>} Newly materialized structural database talent selection record.
   * @throws {NotFoundError} If the underlying userId is missing from the system.
   * @throws {ConflictError} If the targeted user profile is deactivated or already holds talent credentials.
   */
  static async registerAsTalent(
    payload: RegisterTalentPayload,
    client: DbClient | DbTransaction = db,
  ): Promise<TalentRow> {
    const { userId } = payload;

    // 1. Verify that the parent user account node actually exists
    const userRow = await client.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!userRow) {
      throw new NotFoundError("Target user profile does not exist.");
    }

    // 2. Prevent account elevations for blocked or suspended user rows
    if (!userRow.isActive) {
      throw new ConflictError(
        "Action denied. This user account profile is currently deactivated.",
      );
    }

    // 3. Prevent duplicate store initialization attempts
    const existingTalent = await client.query.talents.findFirst({
      where: eq(talents.userId, userId),
    });

    if (existingTalent) {
      throw new ConflictError("This user is already registered as a talent.");
    }

    try {
      // 4. Materialize talent profile structural parameters
      const [newTalent] = await client
        .insert(talents)
        .values({
          userId: userId,
          bio: payload.bio,
          skills: payload.skills,
        })
        .returning();

      // 5. Upgrade contextual access flags inside the identity space
      await client
        .update(users)
        .set({
          currentContext: USER_CONTEXT.TALENT,
          updatedAt: sql`now()`,
        })
        .where(eq(users.id, userId));

      return newTalent;
    } catch (error) {
      logger.error(
        { userId, err: error },
        "DATABASE WRITE FAULT: Operational failure inside catalog module registerAsTalent pipeline.",
      );
      throw error;
    }
  }
}
