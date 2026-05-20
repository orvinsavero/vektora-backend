import { IdentityService } from "../services/identity.service";
import { IdentitySerializer } from "../response/identitiy.serializer";
import { ApiResponse } from "@/shared/http/response";
import { AuthenticatedNextRequest } from "@/shared/interceptors/auth-guard";

/**
 * Controller Handler for Self-Service Personal Profile Lookups.
 * Protected application entry point consuming cryptographically verified request context metadata.
 * @param {AuthenticatedNextRequest} req - Ambient inbound NextJS network request wrapped with token identities.
 * @returns {Promise<Response>} Structured public wire serialization contract or centralized error response.
 */
export async function getUserProfileController(
  req: AuthenticatedNextRequest,
): Promise<Response> {
  try {
    // Extract the verified user UUID mounted securely by the requireAuth perimeter gate
    const activeUserId = req.user.id;

    // Execute lookup down the infrastructure chain
    const rawUser = await IdentityService.getUserProfileById(activeUserId);

    // Transform the raw entity into the strict outbound contract shape
    const serializedUser = IdentitySerializer.formatUserProfile(rawUser);

    return ApiResponse.success(serializedUser, 200);
  } catch (error) {
    return ApiResponse.handle(error);
  }
}
