import { NextRequest } from "next/server";
import { IdentityService } from "@/modules/identity/identity.service";
import { registerTalentSchema } from "@/modules/identity/request";
import { IdentitySerializer } from "@/modules/identity/response";
import { ApiResponse } from "@/shared/http/response";
import { traceRoute } from "@/shared/interceptors/route-handler";

/**
 * Endpoint Handler for Talent Profile Conversions.
 * Intercepts incoming user account contextual upgrades, enforces strict validation bounds,
 * and tracks performance telemetry metrics natively.
 *
 * @param {NextRequest} req - Inbound framework request stream proxy.
 * @returns {Promise<Response>} Structured serialization response envelope.
 */
export const POST = traceRoute(async (req: NextRequest): Promise<Response> => {
  try {
    const body = await req.json();

    // Validate request constraints at the boundary perimeter
    const validatedData = registerTalentSchema.parse(body);

    // Delegate processing down to the service layer (internal transaction handled inside service)
    const rawTalent = await IdentityService.registerAsTalent(validatedData);

    // Apply exact data translation formatting rules to strip internal database symbols
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
});
