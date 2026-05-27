import { NextRequest } from "next/server";
import { loginSchema } from "../../_shared/request/login.dto";
import { AuthService } from "../auth.service";
import { IdentitySerializer } from "../../_shared/response/identity.serializer";
import { ApiResponse, CookieManager } from "@/shared/http/response";

/**
 * Controller Handler handling identity session generation pathways.
 */
export async function loginController(req: NextRequest): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}));
    const validatedData = loginSchema.parse(body);

    // Coordinate with specialized auth service to check keys and hash arrays
    const { token, user } = await AuthService.login(validatedData);

    // Format payload using the clean auth bootstrap state mapping
    const serializedAuth = IdentitySerializer.formatAuthResponse(user);
    const response = ApiResponse.success(serializedAuth, 200);

    // Inject HTTP-Only cookie parameter traces cleanly into response headers
    CookieManager.injectAuthCookie(response, token);
    return response;
  } catch (error) {
    return ApiResponse.handle(error);
  }
}
