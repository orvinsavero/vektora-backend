import { AuthenticatedNextRequest } from "@/shared/interceptors/auth-guard";
import { createPortfolioSchema } from "../request/create-portfolio.dto";
import { CatalogService } from "../services/catalog.service";
import { CatalogSerializer } from "../response/catalog.serializer"; // <-- Add Import
import { ApiResponse } from "@/shared/http/response";

export async function createPortfolioController(
  req: AuthenticatedNextRequest,
): Promise<Response> {
  try {
    const rawBody = await req.json().catch(() => ({}));
    const validatedData = createPortfolioSchema.parse(rawBody);

    const completedProjectRecord = await CatalogService.createPortfolio({
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
