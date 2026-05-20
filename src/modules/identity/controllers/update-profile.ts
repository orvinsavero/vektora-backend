import { IdentityService } from "../services/identity.service";
import { IdentitySerializer } from "../response/identity.serializer";
import { updateProfileSchema } from "../request/update-profile.dto";
import { ApiResponse } from "@/shared/http/response";
import { AuthenticatedNextRequest } from "@/shared/interceptors/auth-guard";
import { ValidationError } from "@/shared/errors/app-error";

/**
 * Controller Handler for Personal Profile Modifications.
 * Validates untrusted body contents against a whitelist before executing updates.
 * @param {AuthenticatedNextRequest} req - Inbound network request with token payload context.
 * @returns {Promise<Response>} Transformed user metadata object or validation fault.
 */
export async function updateProfileController(
  req: AuthenticatedNextRequest,
): Promise<Response> {
  try {
    const activeUserId = req.user.id;
    const rawBody = await req.json().catch(() => ({}));

    // Parse incoming data against our Zod schema runtime validation constraints
    const validationResult = updateProfileSchema.safeParse(rawBody);

    if (!validationResult.success) {
      throw new ValidationError(
        validationResult.error.errors.map((e) => e.message).join(", "),
      );
    }

    // Pass the parsed whitelisted payload down to the mutation engine
    const updatedUser = await IdentityService.updateUserProfile(
      activeUserId,
      validationResult.data,
    );

    // Format output through the dedicated user profile response view wrapper
    const serializedUser = IdentitySerializer.formatUserProfile(updatedUser);

    return ApiResponse.success(serializedUser, 200);
  } catch (error) {
    return ApiResponse.handle(error);
  }
}
