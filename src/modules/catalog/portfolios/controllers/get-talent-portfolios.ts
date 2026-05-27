import { NextRequest } from "next/server";
import { PortfoliosService } from "../portfolios.service"; // Fixed path routing target links
import { CatalogSerializer } from "../../_shared/response/catalog.serializer";
import { ApiResponse } from "@/shared/http/response";
import { ValidationError } from "@/shared/errors/app-error";

/**
 * Controller Handler for Listing Public Storefront Portfolios belonging to an ID.
 */
export async function getTalentPortfoliosController(
  req: NextRequest,
  context: { params: { id: string } },
): Promise<Response> {
  try {
    const talentId = context?.params?.id;
    if (!talentId) {
      throw new ValidationError(
        "Target talent identifier path parameter is missing.",
      );
    }

    const rawPortfolios =
      await PortfoliosService.getPortfoliosByTalentId(talentId);
    const serializedPortfolios = rawPortfolios.map((item) =>
      CatalogSerializer.formatPortfolio(item, item.attachments),
    );
    return ApiResponse.success(serializedPortfolios, 200);
  } catch (error) {
    return ApiResponse.handle(error);
  }
}
