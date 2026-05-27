// src/modules/catalog/controllers/get-portfolio.ts
import { NextRequest } from "next/server";
import { CatalogService } from "../services/catalog.service";
import { CatalogSerializer } from "../response/catalog.serializer";
import { ApiResponse } from "@/shared/http/response";
import { ValidationError } from "@/shared/errors/app-error";

/**
 * Controller Handler for Fetching an Individual Portfolio Showcase.
 *
 * @param {NextRequest} req - Inbound framework network request abstraction.
 * @param {Object} context - Native Next.js Router dynamic parameters map.
 * @returns {Promise<Response>} API success envelope enclosing the formatted portfolio view contract.
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

    // Resolve row specifications through backend selector infrastructure
    const rawPortfolio = await CatalogService.getPortfolioById(portfolioId);

    // Filter raw persistence signatures out across the serialization barrier
    const serializedPortfolio = CatalogSerializer.formatPortfolio(
      rawPortfolio,
      rawPortfolio.attachments,
    );

    return ApiResponse.success(serializedPortfolio, 200);
  } catch (error) {
    return ApiResponse.handle(error);
  }
}
