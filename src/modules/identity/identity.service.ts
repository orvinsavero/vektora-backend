import { db, dbStorage, DbClient, DbTransaction } from "@/db";
import { users, talents } from "./identity.schema";
import { or, eq, sql } from "drizzle-orm";
import { USER_CONTEXT } from "./identity.constants";
import { RegisterUserPayload, RegisterTalentPayload } from "./validators";
import { ConflictError, NotFoundError } from "@/shared/errors/app-error";
import { SecurityUtil } from "@/shared/utils/security.util";
import { logger } from "@/shared/utils/logger.util";

/**
 * Identity Management Domain Service Layer.
 * Orchestrates transaction-safe business procedures, cryptographically seals credentials,
 * and maintains data invariants across user profile lifecycle mutations.
 */
export class IdentityService {
  /**
   * Evaluates identity uniqueness invariants and materializes new baseline user records.
   * Performs asynchronous password hashing using Argon2id prior to row insertion.
   * * @param {RegisterUserPayload} payload - Validated user registration inputs.
   * @param {DbClient | DbTransaction} [client=db] - Ambient execution client or active transaction proxy runner.
   * @returns {Promise<typeof users.$inferSelect>} Freshly created database user row record.
   */
  static async registerNewUser(
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

    // Intercept plain-text credential arrays and generate a secure Argon2id cryptographic signature string
    const passwordHash = await SecurityUtil.hashPassword(payload.password);

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
   * Executes a multi-stage operational lifecycle upgrade to link and transition a user to talent status.
   * Leverages the ambient execution context or parameters to guarantee execution atomicity.
   * * @param {RegisterTalentPayload} payload - Validated profile configuration inputs.
   * @param {DbClient | DbTransaction} [client=db] - Ambient execution client or active transaction proxy runner.
   * @returns {Promise<typeof talents.$inferSelect>} Freshly created database talent row record.
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

    if (!userRow.isActive) {
      throw new ConflictError(
        "Action denied. This user account profile is currently deactivated.",
      );
    }

    const existingTalent = await client.query.talents.findFirst({
      where: eq(talents.userId, userId),
    });

    if (existingTalent) {
      throw new ConflictError("This user is already registered as a talent.");
    }

    try {
      /**
       * Execute queries directly against the scoped client context reference proxy.
       * Eliminates nested inner transaction allocations if invoked inside an active controller transaction block.
       */
      const [newTalent] = await client
        .insert(talents)
        .values({
          userId: userId,
          bio: payload.bio,
          skills: payload.skills,
        })
        .returning();

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
        "➔ Operational failure inside registerAsTalent database write execution stream pipeline.",
      );
      throw error;
    }
  }
}
