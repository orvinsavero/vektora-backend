import { NextRequest } from "next/server";
import { IdentityService } from "@/modules/identity/identity.service";
import { registerUserSchema } from "@/modules/identity/request";
import { IdentitySerializer } from "@/modules/identity/response";
import { ApiResponse } from "@/shared/http/response";
import { traceRoute } from "@/shared/interceptors/route-handler";

/**
 * Endpoint Handler for New User Profile Registrations.
 * Intercepts account creation requests and tracks processing metrics natively.
 *
 * @param {NextRequest} req - Inbound framework request stream proxy.
 * @returns {Promise<Response>} Structured serialization response envelope.
 */
export const POST = traceRoute(async (req: NextRequest): Promise<Response> => {
  try {
    const body = await req.json();

    // Validate request constraints at the boundary perimeter
    const validatedData = registerUserSchema.parse(body);

    // Delegate business logic processing down to the service layer
    const rawUser = await IdentityService.registerNewUser(validatedData);

    // Apply exact data translation formatting rules to strip internal database symbols
    const serializedUser = IdentitySerializer.formatUser(rawUser);

    return ApiResponse.success(serializedUser, 201);
  } catch (error) {
    /**
     * Catches and channels exceptions straight to structural JSON wrappers.
     * Automatically appends correlation trace IDs from the ambient context store.
     */
    return ApiResponse.handle(error);
  }
});
