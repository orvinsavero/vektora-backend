import { NextRequest } from "next/server";
import { Security } from "../crypto/security";
import { ApiResponse } from "../http/response";
import { db } from "../database/client";
import { users } from "@/modules/identity/identity.schema";
import { eq } from "drizzle-orm";
import { UserContextType } from "@/modules/identity/identity.constants";

/**
 * Extended request interface mapping the verified identity context.
 * Provides downstream domain features with immediate, type-safe access to core session parameters.
 */
export interface AuthenticatedNextRequest extends NextRequest {
  user: {
    id: string;
    email: string;
    username: string;
    currentContext: UserContextType;
    isVerified: boolean;
  };
}

type AuthenticatedHandler = (
  req: AuthenticatedNextRequest,
) => Promise<Response> | Response;

/**
 * Higher-Order Authentication Guard Interceptor.
 * Extracts session tokens from secure inbound cookies, executes cryptographic signature
 * validation, live-checks database state constraints, and sets structural session metrics.
 */
export function requireAuth(handler: AuthenticatedHandler) {
  return async (req: NextRequest): Promise<Response> => {
    // 1. Extract the token value from the secure HttpOnly cookie wrapper
    const token = req.cookies.get("token")?.value;

    if (!token) {
      return ApiResponse.handleErrorResponse(
        "Authentication token missing. Access denied.",
        401,
      );
    }

    try {
      // 2. Validate token integrity and decode its cryptographically sealed payload
      const decoded = await Security.verifyToken<{ userId: string }>(token);

      if (!decoded || !decoded.userId) {
        return ApiResponse.handleErrorResponse(
          "Invalid session token signatures context.",
          401,
        );
      }

      // 3. Query the live database state to evaluate security parameters and enforce active status
      const [liveUser] = await db
        .select({
          id: users.id,
          email: users.email,
          username: users.username,
          currentContext: users.currentContext,
          isVerified: users.isVerified,
          isActive: users.isActive,
        })
        .from(users)
        .where(eq(users.id, decoded.userId))
        .limit(1);

      if (!liveUser) {
        return ApiResponse.handleErrorResponse(
          "Authenticated user record could not be found.",
          401,
        );
      }

      // Intercept deactivations or administrative suspensions immediately
      if (!liveUser.isActive) {
        return ApiResponse.handleErrorResponse(
          "Access denied. This user account profile has been deactivated.",
          403,
        );
      }

      // 4. Mutate request context casting full hydrated identity values down the call chain
      const authenticatedReq = req as AuthenticatedNextRequest;
      authenticatedReq.user = {
        id: liveUser.id,
        email: liveUser.email,
        username: liveUser.username,
        currentContext: liveUser.currentContext as UserContextType,
        isVerified: liveUser.isVerified,
      };

      return handler(authenticatedReq);
    } catch (error) {
      // Catch token expirations or structural tampering anomalies silently
      return ApiResponse.handleErrorResponse(
        "Session expired or invalid. Please re-authenticate.",
        401,
      );
    }
  };
}
