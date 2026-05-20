import { CatalogService } from "../services/catalog.service";
import { registerTalentSchema } from "../../catalog/request/register-talent.dto";
import { CatalogSerializer } from "../response/catalog.serializer";
import { ApiResponse } from "@/shared/http/response";
import { AuthenticatedNextRequest } from "@/shared/interceptors/auth-guard";

/**
 * Controller Handler for Talent Conversions.
 * Protected Boundary Handler consuming verified ambient request context states.
 */
export async function registerTalentController(
  req: AuthenticatedNextRequest,
): Promise<Response> {
  try {
    const body = await req.json();
    const validatedData = registerTalentSchema.parse(body);

    const targetUserId = req.user.id;

    // Delegate business execution straight down to the catalog core service layer
    const rawTalent = await CatalogService.registerAsTalent({
      userId: targetUserId,
      ...validatedData,
    });

    const serializedTalent = CatalogSerializer.formatTalent(rawTalent);

    return ApiResponse.success(serializedTalent, 201);
  } catch (error) {
    return ApiResponse.handle(error);
  }
}
