import { NextRequest } from "next/server";
import { Security } from "../crypto/security";
import { ApiResponse } from "../http/response";

/**
 * Extended request interface mapping the verified identity context.
 */
export interface AuthenticatedNextRequest extends NextRequest {
  user: {
    id: string;
  };
}

type AuthenticatedHandler = (
  req: AuthenticatedNextRequest,
) => Promise<Response> | Response;

/**
 * Higher-Order Authentication Guard Interceptor.
 * Extracts session tokens from secure inbound cookies, executes cryptographic signature
 * validation, and blocks unauthenticated edge requests before they touch domain logic layers.
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

      // 3. Mutate a shallow clone wrapper of the request to pass user context down the line
      const authenticatedReq = req as AuthenticatedNextRequest;
      authenticatedReq.user = { id: decoded.userId };

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
