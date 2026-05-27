import { AuthenticatedNextRequest } from "@/shared/interceptors/auth-guard";
import { PortfoliosService } from "../portfolios.service"; // Fixed path routing target links
import { ApiResponse } from "@/shared/http/response";
import { ValidationError } from "@/shared/errors/app-error";

/**
 * Controller Handler for Handling Secure Portfolio Showcase Deletions.
 */
export async function deletePortfolioController(
  req: AuthenticatedNextRequest,
  context: { params: { id: string } },
): Promise<Response> {
  try {
    const portfolioId = context?.params?.id;
    if (!portfolioId) {
      throw new ValidationError(
        "Target portfolio identifier path parameter is missing.",
      );
    }

    await PortfoliosService.deletePortfolio(portfolioId, req.user.id);
    return ApiResponse.success(
      { message: "Portfolio item successfully destroyed cleanly." },
      200,
    );
  } catch (error) {
    return ApiResponse.handle(error);
  }
}
