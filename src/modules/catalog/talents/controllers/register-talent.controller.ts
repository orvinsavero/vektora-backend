import { ApiResponse } from "@/shared/http/response";
import { AuthenticatedNextRequest } from "@/shared/interceptors/auth-guard";
import { registerTalentSchema } from "../../_shared/request/register-talent.dto";
import { TalentsService } from "../talents.service";
import { CatalogSerializer } from "../../_shared/response/catalog.serializer";

/**
 * Controller Handler for Upgrade Conversions to Talent Storefront Roles.
 */
export async function registerTalentController(
  req: AuthenticatedNextRequest,
): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}));
    const validatedData = registerTalentSchema.parse(body);

    const talentRecord = await TalentsService.registerNewTalent({
      userId: req.user.id,
      bio: validatedData.bio,
      skills: validatedData.skills,
    });

    const serializedResult =
      CatalogSerializer.formatTalentProfile(talentRecord);
    return ApiResponse.success(serializedResult, 201);
  } catch (error) {
    return ApiResponse.handle(error);
  }
}
