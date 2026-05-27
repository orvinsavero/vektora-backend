import { AuthenticatedNextRequest } from "@/shared/interceptors/auth-guard";
import { updatePortfolioSchema } from "../../_shared/request/update-portfolio.dto";
import { PortfoliosService } from "../portfolios.service"; // Fixed path routing target links
import { CatalogSerializer } from "../../_shared/response/catalog.serializer";
import { ApiResponse } from "@/shared/http/response";
import { ValidationError } from "@/shared/errors/app-error";

/**
 * Controller Handler for Modifying Targeted Portfolio Material Elements.
 */
export async function updatePortfolioController(
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

    const rawBody = await req.json().catch(() => ({}));
    const validationResult = updatePortfolioSchema.safeParse(rawBody);

    if (!validationResult.success) {
      throw new ValidationError(
        validationResult.error.errors.map((e) => e.message).join(", "),
      );
    }

    const updatedProjectRecord = await PortfoliosService.updatePortfolio({
      portfolioId,
      talentId: req.user.id,
      title: validationResult.data.title,
      description: validationResult.data.description,
      externalLink: validationResult.data.externalLink,
      attachments: validationResult.data.attachments,
    });

    const serializedResponse = CatalogSerializer.formatPortfolio(
      updatedProjectRecord,
      updatedProjectRecord.attachments,
    );
    return ApiResponse.success(serializedResponse, 200);
  } catch (error) {
    return ApiResponse.handle(error);
  }
}
