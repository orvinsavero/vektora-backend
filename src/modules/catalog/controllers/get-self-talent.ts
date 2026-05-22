import { AuthenticatedNextRequest } from "@/shared/interceptors/auth-guard";
import { CatalogService } from "../services/catalog.service";
import { CatalogSerializer } from "../response/catalog.serializer";
import { ApiResponse } from "@/shared/http/response";

/**
 * Controller Handler for Self-Service Talent Profile Lookups.
 * Proxies session user context IDs straight down to core catalog resolution hooks.
 *
 * @param {AuthenticatedNextRequest} req - Inbound security-intercepted network request context.
 * @returns {Promise<Response>} API success payload enclosing fully flattened dashboard records.
 */
export async function getSelfTalentController(
  req: AuthenticatedNextRequest,
): Promise<Response> {
  try {
    // 1. Intercept session account identity parameters directly out of the token gate
    const sessionUserId = req.user.id;

    // 2. Pipeline parameter metrics to the unified backend data locator
    const { talent, user } = await CatalogService.getTalentByUserId({
      userId: sessionUserId,
    });

    // 3. Formulate structural data outputs cleanly across the serialization barrier
    const serializedSelfDetail = CatalogSerializer.formatTalentDetail(
      talent,
      user,
    );

    return ApiResponse.success(serializedSelfDetail, 200);
  } catch (error) {
    return ApiResponse.handle(error);
  }
}
