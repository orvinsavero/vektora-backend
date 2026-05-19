import { db, DbClient, DbTransaction } from "@/db";
import { users, talents } from "./identity.schema";
import { or, eq, sql } from "drizzle-orm";
import { USER_CONTEXT } from "./identity.constants";
import { RegisterUserPayload, RegisterTalentPayload } from "./validators";
import { ConflictError, NotFoundError } from "@/shared/errors/app-error";
import { SecurityUtil } from "@/shared/utils/security.util";
import { logger } from "@/shared/utils/logger.util";

export class IdentityService {
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
        "DATABASE WRITE FAULT: Operational failure inside registerAsTalent database write execution stream pipeline.",
      );
      throw error;
    }
  }
}
