import { IdentityService } from "../services/identity.service";
import { IdentitySerializer } from "../response/identity.serializer";
import { updateAccountSchema } from "../request/update-account.dto";
import { ApiResponse } from "@/shared/http/response";
import { AuthenticatedNextRequest } from "@/shared/interceptors/auth-guard";
import { ValidationError } from "@/shared/errors/app-error";

/**
 * Controller Handler for Sensitive Account Parameters (Email, Username, Password).
 */
export async function updateAccountController(
  req: AuthenticatedNextRequest,
): Promise<Response> {
  try {
    const activeUserId = req.user.id;
    const rawBody = await req.json().catch(() => ({}));

    const validationResult = updateAccountSchema.safeParse(rawBody);

    if (!validationResult.success) {
      throw new ValidationError(
        validationResult.error.errors.map((e) => e.message).join(", "),
      );
    }

    const updatedUser = await IdentityService.updateAccountCredentials(
      activeUserId,
      validationResult.data,
    );

    const serializedUser = IdentitySerializer.formatUserProfile(updatedUser);

    return ApiResponse.success(serializedUser, 200);
  } catch (error) {
    return ApiResponse.handle(error);
  }
}
