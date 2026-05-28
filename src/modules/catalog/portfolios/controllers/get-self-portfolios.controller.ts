import { AuthenticatedNextRequest } from "@/shared/interceptors/auth-guard";
import { PortfoliosService } from "../portfolios.service";
import { TalentsService } from "../../talents/talents.service";
import { CatalogSerializer } from "../../_shared/response/catalog.serializer";
import { ApiResponse } from "@/shared/http/response";

/**
 * Controller Handler resolving personal portfolio project cards collections
 * dynamically via authenticated user tracking session context tokens.
 */
export async function getSelfPortfoliosController(
  req: AuthenticatedNextRequest,
): Promise<Response> {
  try {
    const sessionUserId = req.user.id;

    const rawPortfolios =
      await PortfoliosService.getPortfoliosByTalentId(sessionUserId);

    const serializedPortfolios = rawPortfolios.map((item) =>
      CatalogSerializer.formatPortfolio(item, item.attachments),
    );

    return ApiResponse.success(serializedPortfolios, 200);
  } catch (error) {
    return ApiResponse.handle(error);
  }
}
