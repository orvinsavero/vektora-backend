import { NextRequest } from "next/server";
import { IdentityService } from "@/modules/identity/identity.service";
import {
  registerUserSchema,
  IdentityResponseDto,
} from "@/modules/identity/dto";
import { ApiResponse } from "@/shared/utils/response.util";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Prevent uncaught runtime exceptions by returning parsing states instead of throwing
    const result = registerUserSchema.safeParse(body);

    if (!result.success) {
      // Route validation errors straight to the global handler for structured 400 bad request formatting
      return ApiResponse.handle(result.error);
    }

    const rawUser = await IdentityService.createNewUser(result.data);

    // Sanitize database objects at the API boundary to prevent data leak invariant violations
    const sanitizedUser = IdentityResponseDto.formatUser(rawUser);

    return ApiResponse.success(sanitizedUser, 201);
  } catch (error) {
    // Intercept lower-level network payload errors or invalid JSON format exceptions
    return ApiResponse.handle(error);
  }
}
