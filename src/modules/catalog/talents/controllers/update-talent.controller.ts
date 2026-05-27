import { AuthenticatedNextRequest } from "@/shared/interceptors/auth-guard";
import { updateTalentProfileSchema } from "../../_shared/request/update-talent.dto";
import { TalentsService } from "../talents.service";
import { CatalogSerializer } from "../../_shared/response/catalog.serializer";
import { ApiResponse } from "@/shared/http/response";
import { ValidationError } from "@/shared/errors/app-error";

/**
 * Controller Handler for Modifying Talent Storefront Showcase Settings.
 */
export async function updateTalentProfileController(
  req: AuthenticatedNextRequest,
): Promise<Response> {
  try {
    const activeUserId = req.user.id;
    const body = await req.json().catch(() => ({}));
    const validationResult = updateTalentProfileSchema.safeParse(body);

    if (!validationResult.success) {
      throw new ValidationError(
        validationResult.error.errors.map((e) => e.message).join(", "),
      );
    }

    const updatedTalent = await TalentsService.updateTalentProfile(
      activeUserId,
      validationResult.data,
    );

    const serializedResult =
      CatalogSerializer.formatTalentProfile(updatedTalent);
    return ApiResponse.success(serializedResult, 200);
  } catch (error) {
    return ApiResponse.handle(error);
  }
}
