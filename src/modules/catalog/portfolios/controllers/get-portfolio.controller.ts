import { NextRequest } from "next/server";
import { PortfoliosService } from "../portfolios.service"; // Fixed path routing target links
import { CatalogSerializer } from "../../_shared/response/catalog.serializer";
import { ApiResponse } from "@/shared/http/response";
import { ValidationError } from "@/shared/errors/app-error";

/**
 * Controller Handler for Fetching an Individual Portfolio Showcase Details view model.
 */
export async function getPortfolioController(
  req: NextRequest,
  context: { params: { id: string } },
): Promise<Response> {
  try {
    const portfolioId = context?.params?.id;
    if (!portfolioId) {
      throw new ValidationError(
        "Target portfolio identifier path parameter is missing.",
      );
    }

    const rawPortfolio = await PortfoliosService.getPortfolioById(portfolioId);
    const serializedPortfolio = CatalogSerializer.formatPortfolio(
      rawPortfolio,
      rawPortfolio.attachments,
    );
    return ApiResponse.success(serializedPortfolio, 200);
  } catch (error) {
    return ApiResponse.handle(error);
  }
}
