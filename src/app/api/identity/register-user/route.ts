import { NextRequest } from "next/server";
import { IdentityService } from "@/modules/identity/identity.service";
import { registerUserSchema } from "@/modules/identity/validators";
import { IdentitySerializer } from "@/modules/identity/serializers";
import { ApiResponse } from "@/shared/utils/response.util";

export async function POST(req: NextRequest) {
  try {
    // Fallback block guarantees an object structure even if the incoming payload stream is empty
    const body = await req.json().catch(() => ({}));

    // Prevent uncaught runtime exceptions by returning parsing states instead of throwing
    const result = registerUserSchema.safeParse(body);

    if (!result.success) {
      // Route validation errors straight to the global handler for structured 400 bad request formatting
      return ApiResponse.handle(result.error);
    }

    // Pass the validated payload containing our raw password down to the service for hashing
    const rawUser = await IdentityService.registerNewUser(result.data);

    // Sanitize database objects at the API boundary to prevent data leak invariant violations
    const sanitizedUser = IdentitySerializer.formatUser(rawUser);

    return ApiResponse.success(sanitizedUser, 201);
  } catch (error) {
    // Intercept lower-level network payload errors or invalid JSON format exceptions
    return ApiResponse.handle(error);
  }
}
