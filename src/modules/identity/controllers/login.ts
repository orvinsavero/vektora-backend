import { NextRequest } from "next/server";
import { IdentityService } from "../services/identity.service";
import { loginSchema } from "../request/login.dto";
import { IdentitySerializer } from "../response/user.response";
import { ApiResponse } from "@/shared/http/response";
import { Security } from "@/shared/crypto/security";

/**
 * Core Controller Handler for User Session Authentication.
 * Executes input validation, validates credentials, and injects a secure HTTP-Only session cookie.
 */
export async function loginController(req: NextRequest): Promise<Response> {
  try {
    const body = await req.json();
    const validatedData = loginSchema.parse(body);

    // 1. Authenticate user credentials via service layer
    const user = await IdentityService.authenticateUser(validatedData);

    // 2. Mint a secure JSON Web Token
    const token = await Security.generateToken({ userId: user.id });

    // 3. Serialize user data to strip out password hashes or sensitive internal fields
    const serializedUser = IdentitySerializer.formatAuthResponse(user);

    // 4. Build the JSON success response envelope
    const response = ApiResponse.success({ user: serializedUser }, 200);

    // 5. Inject the secure HTTP-Only cookie header directly into the response
    const cookieOptions = [
      `token=${token}`,
      "Path=/",
      "HttpOnly", // Prevents cross-site scripting (XSS) token extraction
      "Secure", // Forces token transmission only over encrypted TLS/HTTPS connections
      "SameSite=Strict", // Defends against Cross-Site Request Forgery (CSRF) attacks
      `Max-Age=${60 * 60 * 24 * 7}`, // 7 Days expiration span
    ];

    response.headers.set("Set-Cookie", cookieOptions.join("; "));

    return response;
  } catch (error) {
    return ApiResponse.handle(error);
  }
}
