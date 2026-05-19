import { db, dbStorage, DbClient, DbTransaction } from "@/db";
import { users, talents } from "./identity.schema";
import { or, eq, sql } from "drizzle-orm";
import { USER_CONTEXT } from "./identity.constants";
import { RegisterUserPayload, RegisterTalentPayload } from "./validators"; // Swapped out deprecated dto folder path
import { ConflictError, NotFoundError } from "@/shared/errors/app-error";
import { SecurityUtil } from "@/shared/utils/security.util";
import { logger } from "@/shared/utils/logger.util";

export class IdentityService {
  /**
   * Evaluates identity uniqueness invariants and materializes new baseline user records.
   * Performs asynchronous password hashing using Argon2id prior to row insertion.
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

    // Intercept raw plain-text payload entry and convert it to a secure cryptographic hash signature
    const passwordHash = await SecurityUtil.hashPassword(payload.password);

    const [newUser] = await client
      .insert(users)
      .values({
        email: payload.email,
        username: payload.username,
        passwordHash,
        firstName: payload.firstName || null, // Clean split mapping field execution
        lastName: payload.lastName || null, // Clean split mapping field execution
        birthDate: payload.birthDate, // Clean native YYYY-MM-DD validation string passed direct to driver
        avatarUrl: payload.avatarUrl, // Handled cleanly by schema defaults if optional payload values are missing
        currentContext: USER_CONTEXT.USER,
      })
      .returning(); // Returns the full table row structure safely

    return newUser;
  }

  /**
   * Executes a multi-stage transactional lifecycle operation to link and upgrade a user to a talent profile status.
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
          logger.error(
            { userId, err: error },
            "➔ Transaction execution failed in registerAsTalent service cascade. Rollback triggered automatically.",
          );
          throw error;
        }
      });
    });
  }
}
