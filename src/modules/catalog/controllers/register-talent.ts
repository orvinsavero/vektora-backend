import { ApiResponse } from "@/shared/http/response";
import { AuthenticatedNextRequest } from "@/shared/interceptors/auth-guard";
import { registerTalentSchema } from "../request/register-talent.dto";
import { CatalogService } from "../services/catalog.service";
import { CatalogSerializer } from "../response/catalog.serializer";

/**
 * Controller Handler for Upgrade Conversions to Talent Storefront Roles.
 */
export async function registerTalentController(
  req: AuthenticatedNextRequest,
): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}));

    // Evaluate incoming specifications against centralized DTO layout schemas
    const validatedData = registerTalentSchema.parse(body);

    // Invoke state alterations inside the service layer sandbox
    const talentRecord = await CatalogService.registerNewTalent({
      userId: req.user.id,
      bio: validatedData.bio,
      skills: validatedData.skills,
    });

    // Pass row values through the catalog serialization layer formatting layout
    const serializedResult =
      CatalogSerializer.formatTalentProfile(talentRecord);

    return ApiResponse.success(serializedResult, 201);
  } catch (error) {
    return ApiResponse.handle(error);
  }
}
