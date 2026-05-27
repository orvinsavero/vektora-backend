import { AuthenticatedNextRequest } from "@/shared/interceptors/auth-guard";
import { createPortfolioSchema } from "../../_shared/request/create-portfolio.dto";
import { PortfoliosService } from "../portfolios.service"; // Fixed path routing target links
import { CatalogSerializer } from "../../_shared/response/catalog.serializer";
import { ApiResponse } from "@/shared/http/response";

/**
 * Controller Handler for Publishing Fresh Creative Portfolio Materials.
 */
export async function createPortfolioController(
  req: AuthenticatedNextRequest,
): Promise<Response> {
  try {
    const rawBody = await req.json().catch(() => ({}));
    const validatedData = createPortfolioSchema.parse(rawBody);

    const completedProjectRecord = await PortfoliosService.createPortfolio({
      talentId: req.user.id,
      title: validatedData.title,
      description: validatedData.description,
      externalLink: validatedData.externalLink,
      attachments: validatedData.attachments,
    });

    const serializedResponse = CatalogSerializer.formatPortfolio(
      completedProjectRecord,
      completedProjectRecord.attachments,
    );
    return ApiResponse.success(serializedResponse, 201);
  } catch (error) {
    return ApiResponse.handle(error);
  }
}
