import { updateProfileSchema } from "../../_shared/request/update-profile.dto";
import { AccountService } from "../account.service";
import { IdentitySerializer } from "../../_shared/response/identity.serializer";
import { ApiResponse } from "@/shared/http/response";
import { AuthenticatedNextRequest } from "@/shared/interceptors/auth-guard";
import { ValidationError } from "@/shared/errors/app-error";

/**
 * Controller Handler governing personal display configurations edits.
 */
export async function updateProfileController(
  req: AuthenticatedNextRequest,
): Promise<Response> {
  try {
    const rawBody = await req.json().catch(() => ({}));
    const validationResult = updateProfileSchema.safeParse(rawBody);

    if (!validationResult.success) {
      throw new ValidationError(
        validationResult.error.errors.map((e) => e.message).join(", "),
      );
    }

    const updatedUser = await AccountService.updateProfile(
      req.user.id,
      validationResult.data,
    );
    const serializedUser = IdentitySerializer.formatUserProfile(updatedUser);
    return ApiResponse.success(serializedUser, 200);
  } catch (error) {
    return ApiResponse.handle(error);
  }
}
