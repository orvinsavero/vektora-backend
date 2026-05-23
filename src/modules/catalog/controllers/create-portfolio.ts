// src/modules/catalog/controllers/create-portfolio.ts
import { AuthenticatedNextRequest } from "@/shared/interceptors/auth-guard";
import { createPortfolioSchema } from "../request/create-portfolio.dto";
import { CatalogService } from "../services/catalog.service";
import { ApiResponse } from "@/shared/http/response";

/**
 * Controller Handler for Handling Secure Project Showcase Creations.
 * Enforces role guards and builds a unified payload context map.
 *
 * @param {AuthenticatedNextRequest} req - Inbound token-intercepted server runtime request context.
 * @returns {Promise<Response>} API success wrapping the composite portfolio database write.
 */
export async function createPortfolioController(
  req: AuthenticatedNextRequest,
): Promise<Response> {
  try {
    const rawBody = await req.json().catch(() => ({}));

    // Evaluate payload structure metrics down past perimeter constraints checks
    const validatedData = createPortfolioSchema.parse(rawBody);

    // Invoke atomic business mutations down onto structural storage engines
    const completedProjectRecord = await CatalogService.createPortfolio({
      talentId: req.user.id, // Plucked securely out of verification middleware tokens structures
      title: validatedData.title,
      description: validatedData.description,
      externalLink: validatedData.externalLink,
      attachments: validatedData.attachments,
    });

    return ApiResponse.success(completedProjectRecord, 201);
  } catch (error) {
    return ApiResponse.handle(error);
  }
}
