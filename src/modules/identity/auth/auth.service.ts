import { eq, or } from "drizzle-orm";
import { db as defaultDb } from "@/shared/database/client";
import { cache } from "@/shared/cache/redis";
import { Security } from "@/shared/crypto/security";
import { UnauthorizedError } from "@/shared/errors/app-error";
import { users } from "../identity.schema";
import { LoginPayload } from "../_shared/request/login.dto";
import { CONFIG } from "@/config/env.config";

type DatabaseClient = typeof defaultDb;

export class AuthService {
  static async login(input: LoginPayload, db: DatabaseClient = defaultDb) {
    const record = await db.query.users.findFirst({
      where: or(
        eq(users.email, input.usernameOrEmail),
        eq(users.username, input.usernameOrEmail),
      ),
    });

    if (!record || !record.isActive) {
      throw new UnauthorizedError("Invalid account credentials provided.");
    }

    const isPasswordValid = await Security.verifyPassword(
      input.password,
      record.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedError("Invalid account credentials provided.");
    }

    const sessionToken = await Security.generateToken({ userId: record.id });

    // FIX: Write to Redis using YOUR exact highly-optimized format so auth-guard can read it
    if (cache.isOpen) {
      const cacheString = `${String(record.isActive)}|${record.currentContext}`;
      await cache
        .set(`session:active:${record.id}`, cacheString, {
          EX: CONFIG.auth.cacheTtl,
        })
        .catch(() => {});
    }

    return { token: sessionToken, user: record };
  }

  static async logout(userId: string): Promise<void> {
    if (cache.isOpen) {
      await cache.del(`session:active:${userId}`).catch(() => {});
    }
  }
}
