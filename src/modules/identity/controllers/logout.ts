// src/modules/identity/controllers/logout.ts
import { cache } from "@/shared/cache/redis";
import { ApiResponse } from "@/shared/http/response";
import { AuthenticatedNextRequest } from "@/shared/interceptors/auth-guard";

/**
 * Controller Handler for Evicting Authenticated Sessions.
 * Clears the network cookie buffer and purges Redis cache keys instantly.
 */
export async function logoutController(
  req: AuthenticatedNextRequest,
): Promise<Response> {
  try {
    const activeUserId = req.user.id;

    // 1. Instantly evict the session payload from Redis RAM pool
    if (cache.isOpen) {
      cache.del(`session:active:${activeUserId}`).catch(() => {});
    }

    // 2. Build response and overwrite the cookie with an immediate expiration date
    const response = ApiResponse.success(
      { message: "Logged out successfully." },
      200,
    );

    response.headers.set(
      "Set-Cookie",
      "auth_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    );

    return response;
  } catch (error) {
    return ApiResponse.handle(error);
  }
}
