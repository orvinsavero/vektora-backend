// src/modules/identity/controllers/logout.ts
import { cache } from "@/shared/cache/redis";
import { ApiResponse, CookieManager } from "@/shared/http/response";
import { AuthenticatedNextRequest } from "@/shared/interceptors/auth-guard";

/**
 * Controller Handler for Evicting Authenticated Sessions.
 * Purges Redis cache keys and clears the client browser session token cleanly.
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

    // 2. Build response envelope layer
    const response = ApiResponse.success(
      { message: "Logged out successfully." },
      200,
    );

    // 3. Evict auth session cookies securely via the centralized helper utility
    CookieManager.clearAuthCookie(response);

    return response;
  } catch (error) {
    return ApiResponse.handle(error);
  }
}
