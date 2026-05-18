import { db, dbStorage, DbClient, DbTransaction } from "@/db";
import { users, talents } from "./identity.schema";
import { or, eq, sql } from "drizzle-orm";
import { USER_CONTEXT } from "./identity.constants";
import { RegisterUserPayload, RegisterTalentPayload } from "./dto";
import { ConflictError, NotFoundError } from "@/shared/errors/app-error";
import { logger } from "@/shared/utils/logger.util";

export class IdentityService {
  /**
   * Evaluates identity uniqueness invariants and materializes new baseline user records.
   * Supports explicit dependency injection to bypass default pool proxies during testing or cross-domain orchestrations.
   */
  static async createNewUser(
    payload: RegisterUserPayload,
    client: DbClient | DbTransaction = db,
  ) {
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

    const [newUser] = await client
      .insert(users)
      .values({
        email: payload.email,
        username: payload.username,
        fullName: payload.fullName || null,
        avatarUrl: payload.avatarUrl,
        currentContext: USER_CONTEXT.USER,
      })
      .returning();

    return newUser;
  }

  /**
   * Executes a multi-stage transactional lifecycle operation to link and upgrade a user to a talent profile status.
   * Leverages isolated transactional boundaries with safe error telemetry capture prior to executing database engine rollbacks.
   */
  static async registerAsTalent(
    payload: RegisterTalentPayload,
    client: DbClient | DbTransaction = db,
  ) {
    const { userId } = payload;

    const userRow = await client.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!userRow) {
      throw new NotFoundError("Target user profile does not exist.");
    }

    const existingTalent = await client.query.talents.findFirst({
      where: eq(talents.userId, userId),
    });
    if (existingTalent) {
      throw new ConflictError("This user is already registered as a talent.");
    }

    return await client.transaction(async (tx) => {
      return await dbStorage.run(tx, async () => {
        try {
          const [newTalent] = await tx
            .insert(talents)
            .values({
              userId: userId,
              bio: payload.bio || null,
              skills: payload.skills,
            })
            .returning();

          await tx
            .update(users)
            .set({
              currentContext: USER_CONTEXT.TALENT,
              updatedAt: sql`now()`,
            })
            .where(eq(users.id, userId));

          return newTalent;
        } catch (error) {
          // Log specific structural details or connection faults before bubble-up truncation destroys execution state
          logger.error(
            { userId, err: error },
            "➔ Transaction execution failed in registerAsTalent service cascade. Rollback triggered automatically.",
          );

          // Escalate the raw exception to let the database client orchestrate the physical rollback and preserve custom app error mappings
          throw error;
        }
      });
    });
  }
}
