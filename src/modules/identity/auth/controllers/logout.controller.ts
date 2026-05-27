import { ApiResponse, CookieManager } from "@/shared/http/response";
import { AuthenticatedNextRequest } from "@/shared/interceptors/auth-guard";
import { AuthService } from "../auth.service";

/**
 * Controller Handler executing background session invalidation loops.
 */
export async function logoutController(
  req: AuthenticatedNextRequest,
): Promise<Response> {
  try {
    // Evict active database keys from memory store using request context IDs
    await AuthService.logout(req.user.id);

    const response = ApiResponse.success(
      { message: "Logged out successfully." },
      200,
    );
    CookieManager.clearAuthCookie(response);
    return response;
  } catch (error) {
    return ApiResponse.handle(error);
  }
}
