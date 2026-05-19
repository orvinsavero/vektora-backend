import { NextRequest } from "next/server";
import { IdentityService } from "../services/identity.service";
import { registerTalentSchema } from "../request/register-talent.dto";
import { IdentitySerializer } from "../response/user.response";
import { ApiResponse } from "@/shared/http/response";

/**
 * Core Controller Handler for Talent Profile Conversions.
 * Extracts, validates, and orchestrates data mapping at the identity module boundary.
 */
export async function registerTalentController(
  req: NextRequest,
): Promise<Response> {
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
}
