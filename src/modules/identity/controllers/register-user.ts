import { NextRequest } from "next/server";
import { IdentityService } from "../services/identity.service";
import { registerUserSchema } from "../request/register-user.dto";
import { IdentitySerializer } from "../response/identity.serializer";
import { ApiResponse, CookieManager } from "@/shared/http/response";
import { Security } from "@/shared/crypto/security";

/**
 * Controller Handler for Handling Public Account Registrations.
 * Validates inbound parameter payloads and automatically mints an active session context.
 * @param {NextRequest} req - Inbound network request container abstraction.
 * @returns {Promise<Response>} Structured success wrapping serialized account records with authentication cookies.
 */
export async function registerUserController(
  req: NextRequest,
): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}));

    // Evaluate payload structure against centralized zod compilation rules
    const validatedData = registerUserSchema.parse(body);

    // Commit state transitions directly down onto database connection references
    const rawUser = await IdentityService.registerNewUser(validatedData);

    // Mint a cryptographically secure session token instantly upon account creation
    const sessionToken = await Security.generateToken({ userId: rawUser.id });

    // Format relational engine output schemas safely through the serialization firewall
    const serializedUser = IdentitySerializer.formatUser(rawUser);

    // Construct response envelope with 201 Created state representation
    const response = ApiResponse.success(serializedUser, 201);

    // Inject the HttpOnly session token cookie directly into response headers
    CookieManager.injectAuthCookie(response, sessionToken);

    return response;
  } catch (error) {
    return ApiResponse.handle(error);
  }
}
