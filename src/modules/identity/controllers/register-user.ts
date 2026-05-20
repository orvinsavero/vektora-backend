import { NextRequest } from "next/server";
import { IdentityService } from "../services/identity.service";
import { registerUserSchema } from "../request/register-user.dto";
import { IdentitySerializer } from "../response/identitiy.serializer";
import { ApiResponse } from "@/shared/http/response";

/**
 * Core Controller Handler for New User Profile Registrations.
 * Extracts, validates, and orchestrates data mapping at the identity module boundary.
 */
export async function registerUserController(
  req: NextRequest,
): Promise<Response> {
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
}
