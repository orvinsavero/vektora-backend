import { AuthenticatedNextRequest } from "@/shared/interceptors/auth-guard";
import { updateTalentProfileSchema } from "../request/update-talent.dto";
import { CatalogService } from "../services/catalog.service";
import { CatalogSerializer } from "../response/catalog.serializer";
import { ApiResponse } from "@/shared/http/response";
import { ValidationError } from "@/shared/errors/app-error";

/**
 * Controller Handler for Handling Talent Storefront Modifications.
 * Validates the inbound payload whitelist and updates the matching authenticated session context.
 *
 * @param {AuthenticatedNextRequest} req - Security-intercepted inbound network request.
 * @returns {Promise<Response>} Success envelope enclosing the re-hydrated talent record details.
 */
export async function updateTalentProfileController(
  req: AuthenticatedNextRequest,
): Promise<Response> {
  try {
    const activeUserId = req.user.id;
    const body = await req.json().catch(() => ({}));

    // Evaluate incoming body parameters against the whitelisted Zod DTO schema constraints
    const validationResult = updateTalentProfileSchema.safeParse(body);
    if (!validationResult.success) {
      throw new ValidationError(
        validationResult.error.errors.map((e) => e.message).join(", "),
      );
    }

    // Pass the parsed, clean data down to the mutation engine
    const updatedTalent = await CatalogService.updateTalentProfile(
      activeUserId,
      validationResult.data,
    );

    // Format output through the dedicated user profile response view wrapper
    const serializedResult =
      CatalogSerializer.formatTalentProfile(updatedTalent);

    return ApiResponse.success(serializedResult, 200);
  } catch (error) {
    return ApiResponse.handle(error);
  }
}
