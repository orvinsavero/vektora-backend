import { NextRequest } from "next/server";
import { CatalogService } from "../services/catalog.service";
import { CatalogSerializer } from "../response/catalog.serializer";
import { ApiResponse } from "@/shared/http/response";
import { ValidationError } from "@/shared/errors/app-error";

/**
 * Controller Handler for Listing Public Storefront Portfolios.
 * Resolves targeted user identifiers straight down to clean, serialized wire response arrays.
 *
 * @param {NextRequest} req - Inbound framework network request interface.
 * @param {Object} context - Native Next.js App Router dynamic parameter container.
 * @returns {Promise<Response>} API success envelope enclosing the formatted portfolio collection dataset.
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

    // Pipeline retrieval down through relational service layers
    const rawPortfolios =
      await CatalogService.getPortfoliosByTalentId(talentId);

    // Transform raw db records cleanly via your dedicated portfolio formatter contract
    const serializedPortfolios = rawPortfolios.map((item) =>
      CatalogSerializer.formatPortfolio(item, item.attachments),
    );

    return ApiResponse.success(serializedPortfolios, 200);
  } catch (error) {
    return ApiResponse.handle(error);
  }
}
