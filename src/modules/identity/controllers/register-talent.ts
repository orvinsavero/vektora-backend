import { IdentityService } from "../services/identity.service";
import { registerTalentSchema } from "../request/register-talent.dto";
import { IdentitySerializer } from "../response/user.response";
import { ApiResponse } from "@/shared/http/response";
import { AuthenticatedNextRequest } from "@/shared/interceptors/auth-guard";

/**
 * Core Controller Handler for Talent Profile Conversions.
 * Protected Boundary Endpoint handler consuming ambient verified request context profiles.
 */
export async function registerTalentController(
  req: AuthenticatedNextRequest,
): Promise<Response> {
  // This 'Response' refers safely to the global Web API type definition
  try {
    const body = await req.json();

    // 1. Validate incoming business parameters (bio, skills) at the wire boundary
    const validatedData = registerTalentSchema.parse(body);

    // 2. Securely pull the authenticated user identity injected by the auth guard interceptor
    const targetUserId = req.user.id;

    // 3. Delegate execution down to the service combining token identity and body assets
    const rawTalent = await IdentityService.registerAsTalent({
      userId: targetUserId,
      ...validatedData,
    });

    // 4. Apply exact data translation formatting rules to hide system symbols
    const serializedTalent = IdentitySerializer.formatTalent(rawTalent);

    return ApiResponse.success(serializedTalent, 201);
  } catch (error) {
    /**
     * Centralized exception interceptor.
     * Automatically extracts AsyncLocalStorage tracking tokens to log anomalies
     * before mapping raw faults to predictable HTTP status structures.
     */
    return ApiResponse.handle(error);
  }
}
