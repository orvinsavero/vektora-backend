import { AuthenticatedNextRequest } from "@/shared/interceptors/auth-guard";
import { CatalogService } from "../services/catalog.service";
import { ApiResponse } from "@/shared/http/response";
import { ValidationError } from "@/shared/errors/app-error";

/**
 * Controller Handler for Handling Secure Portfolio Showcase Deletions.
 *
 * @param {AuthenticatedNextRequest} req - Inbound token-intercepted NextJS request context.
 * @param {Object} context - Native Next.js App Router dynamic routing parameters.
 * @returns {Promise<Response>} Empty HTTP 200 or 204 success signaling complete deletion.
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

    // Forward deletion requests directly down onto structural storage engines
    await CatalogService.deletePortfolio(portfolioId, req.user.id);

    // Return a clean success payload container acknowledging the flush operation
    return ApiResponse.success(
      { message: "Portfolio item successfully destroyed cleanly." },
      200,
    );
  } catch (error) {
    return ApiResponse.handle(error);
  }
}
