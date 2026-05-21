import { NextRequest } from "next/server";
import { Security } from "../crypto/security";
import { ApiResponse } from "../http/response";
import { db } from "../database/client";
import { users } from "@/modules/identity/identity.schema";
import {
  USER_CONTEXT,
  UserContextType,
} from "@/modules/identity/identity.constants";
import { eq } from "drizzle-orm";
import { cache } from "../cache/redis";
import { logger } from "../telemetry/logger";
import { CONFIG } from "@/config/env.config";

export interface AuthenticatedNextRequest extends NextRequest {
  user: {
    id: string;
    currentContext: string;
  };
}

type AuthenticatedHandler = (
  req: AuthenticatedNextRequest,
) => Promise<Response> | Response;

/**
 * Higher-Order Authentication Guard Interceptor.
 * Implements a resilient cache-aside proxy structure to completely bypass the core database
 * for active status authorization on high-frequency API pathways.
 */
export function requireAuth(handler: AuthenticatedHandler) {
  return async (req: NextRequest): Promise<Response> => {
    const token = req.cookies.get("token")?.value;

    if (!token) {
      return ApiResponse.handleErrorResponse(
        "Authentication token missing. Access denied.",
        401,
      );
    }

    try {
      // 1. Verify token cryptographic integrity in server memory
      const decoded = await Security.verifyToken<{ userId: string }>(token);

      if (!decoded || !decoded.userId) {
        return ApiResponse.handleErrorResponse(
          "Invalid session token signatures context.",
          401,
        );
      }

      const userId = decoded.userId;
      const cacheKey = `session:active:${userId}`;
      let isActive = false;
      let isCacheHit = false;
      let currentContext: UserContextType = USER_CONTEXT.USER;

      // 2. Safely attempt to query the in-memory Redis cluster
      if (cache.isOpen) {
        try {
          const cachedStatus = await cache.get(cacheKey);
          if (cachedStatus !== null) {
            const [statusStr, contextStr] = cachedStatus.split("|");
            isActive = statusStr === "true";
            currentContext = contextStr as UserContextType;
            isCacheHit = true;
          }
        } catch (cacheErr) {
          // Fail-open to database fallback if Redis drops packets or times out
          logger.warn(
            { err: cacheErr, userId },
            "AUTH GUARD CACHE WARNING: Redis read failure. Falling back to DB.",
          );
          isCacheHit = false;
        }
      }

      // 3. Cache Miss: Fall back to PostgreSQL via Drizzle ORM
      if (!isCacheHit) {
        const [liveUser] = await db
          .select({
            isActive: users.isActive,
            currentContext: users.currentContext,
          })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (!liveUser) {
          return ApiResponse.handleErrorResponse(
            "Authenticated user record could not be found.",
            401,
          );
        }

        isActive = liveUser.isActive;
        currentContext = liveUser.currentContext as UserContextType;

        // 4. Populate cache metrics back to Redis asynchronously with a 10-minute window
        if (cache.isOpen) {
          cache
            .set(cacheKey, `${String(isActive)}|${currentContext}`, {
              EX: CONFIG.auth.cacheTtl,
            })
            .catch((writeErr) => {
              logger.error(
                { err: writeErr, userId },
                "AUTH GUARD CACHE ERROR: Failed to write back key.",
              );
            });
        }
      }

      // 5. Fire enforcement gate immediately if account status is tripped
      if (!isActive) {
        return ApiResponse.handleErrorResponse(
          "Access denied. This user account profile has been deactivated.",
          403,
        );
      }

      const authenticatedReq = req as AuthenticatedNextRequest;
      authenticatedReq.user = { id: userId, currentContext };

      return handler(authenticatedReq);
    } catch (error) {
      return ApiResponse.handleErrorResponse(
        "Session expired or invalid. Please re-authenticate.",
        401,
      );
    }
  };
}

/**
 * Role Gate: Restricts access strictly to active Talent profiles.
 */
export function requireTalent(handler: AuthenticatedHandler) {
  return requireAuth(async (req: AuthenticatedNextRequest) => {
    if (req.user.currentContext !== USER_CONTEXT.TALENT) {
      return ApiResponse.handleErrorResponse(
        "Access denied. This action requires a registered Talent profile.",
        403,
      );
    }
    return handler(req);
  });
}
