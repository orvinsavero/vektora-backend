import { NextRequest } from "next/server";
import { IdentityService } from "@/modules/identity/identity.service";
import { registerTalentSchema } from "@/modules/identity/validators";
import { IdentitySerializer } from "@/modules/identity/serializers";
import { ApiResponse } from "@/shared/utils/response.util";

export async function POST(req: NextRequest) {
  try {
    // Fallback block guarantees an object structure even if the incoming payload stream is empty
    const body = await req.json().catch(() => ({}));

    // Prevent uncaught runtime exceptions by returning parsing states instead of throwing
    const result = registerTalentSchema.safeParse(body);

    if (!result.success) {
      // Route validation errors straight to the global handler for structured 400 bad request formatting
      return ApiResponse.handle(result.error);
    }

    const rawTalent = await IdentityService.registerAsTalent(result.data);

    // Sanitize database objects at the API boundary to prevent data leak invariant violations
    const sanitizedTalent = IdentitySerializer.formatTalent(rawTalent);

    return ApiResponse.success(sanitizedTalent, 201);
  } catch (error) {
    // Intercept lower-level network payload errors or invalid JSON format exceptions
    return ApiResponse.handle(error);
  }
}
