import { NextRequest } from "next/server";
import { registerUserSchema } from "../../_shared/request/register-user.dto";
import { UserService } from "../user.service";
import { IdentitySerializer } from "../../_shared/response/identity.serializer";
import { ApiResponse, CookieManager } from "@/shared/http/response";
import { Security } from "@/shared/crypto/security";

/**
 * Controller Handler managing new unauthenticated registration queries.
 */
export async function registerUserController(
  req: NextRequest,
): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}));
    const validatedData = registerUserSchema.parse(body);

    // Commit baseline user accounts configuration to the system tables
    const rawUser = await UserService.registerUser(validatedData);
    const sessionToken = await Security.generateToken({ userId: rawUser.id });

    // Automatically bootstrapping session payload mappings right after register
    const serializedAuth = IdentitySerializer.formatAuthResponse(rawUser);
    const response = ApiResponse.success(serializedAuth, 201);

    CookieManager.injectAuthCookie(response, sessionToken);
    return response;
  } catch (error) {
    return ApiResponse.handle(error);
  }
}
