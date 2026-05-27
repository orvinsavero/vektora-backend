import { ApiResponse } from "@/shared/http/response";
import { AuthenticatedNextRequest } from "@/shared/interceptors/auth-guard";
import { AccountService } from "../account.service";
import { IdentitySerializer } from "../../_shared/response/identity.serializer";

/**
 * Controller Handler extracting authenticated user personal metadata context.
 */
export async function getProfileController(
  req: AuthenticatedNextRequest,
): Promise<Response> {
  try {
    const record = await AccountService.getProfile(req.user.id);

    // Fully hydrate frontend display contexts using complete profile properties maps
    const serializedProfile = IdentitySerializer.formatUserProfile(record);
    return ApiResponse.success(serializedProfile, 200);
  } catch (error) {
    return ApiResponse.handle(error);
  }
}
