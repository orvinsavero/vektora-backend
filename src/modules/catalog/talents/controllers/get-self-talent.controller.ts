import { AuthenticatedNextRequest } from "@/shared/interceptors/auth-guard";
import { TalentsService } from "../talents.service";
import { CatalogSerializer } from "../../_shared/response/catalog.serializer";
import { ApiResponse } from "@/shared/http/response";

/**
 * Controller Handler for Self-Service Talent Profile Lookups via Session Tokens.
 */
export async function getSelfTalentController(
  req: AuthenticatedNextRequest,
): Promise<Response> {
  try {
    const sessionUserId = req.user.id;
    const { talent, user } = await TalentsService.getTalentByUserId({
      userId: sessionUserId,
    });

    const serializedSelfDetail = CatalogSerializer.formatTalentDetail(
      talent,
      user,
    );
    return ApiResponse.success(serializedSelfDetail, 200);
  } catch (error) {
    return ApiResponse.handle(error);
  }
}
