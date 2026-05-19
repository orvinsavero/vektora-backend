import { NextRequest } from "next/server";
import { IdentityService } from "../services/identity.service";
import { loginSchema } from "../request/login.dto";
import { IdentitySerializer } from "../response/user.response";
import { ApiResponse, CookieManager } from "@/shared/http/response";
import { Security } from "@/shared/crypto/security";

/**
 * Core Controller Handler for User Session Authentication.
 * Validates credentials, sanitizes outbound models, and offloads cookie management.
 */
export async function loginController(req: NextRequest): Promise<Response> {
  try {
    const body = await req.json();
    const validatedData = loginSchema.parse(body);

    // 1. Authenticate user credentials via service layer pool
    const user = await IdentityService.authenticateUser(validatedData);

    // 2. Mint a secure JSON Web Token variant
    const token = await Security.generateToken({ userId: user.id });

    // 3. Serialize user entity data to seal internal database details
    const serializedUser = IdentitySerializer.formatAuthResponse(user);

    // 4. Build the JSON success response envelope layer
    const response = ApiResponse.success({ user: serializedUser }, 200);

    // 5. Inject decoupled auth session cookies securely via the helper utility
    CookieManager.injectAuthCookie(response, token);

    return response;
  } catch (error) {
    return ApiResponse.handle(error);
  }
}
