import { NextRequest } from "next/server";
import { CatalogService } from "../services/catalog.service";
import { CatalogSerializer } from "../response/catalog.serializer";
import { ApiResponse } from "@/shared/http/response";
import { NotFoundError } from "@/shared/errors/app-error";

/**
 * Controller Handler for Fetching Public Talent Storefront Profiles.
 * Resolves targeted user identifiers straight down to hydrated data summaries.
 *
 * @param {NextRequest} req - Inbound framework network request interface.
 * @param {Object} context - Native Next.js dynamic routing configuration container.
 * @param {Object} context.params - Extracted routing key parameters map context.
 * @param {string} context.params.id - The target user account tracking UUID identifier.
 * @returns {Promise<Response>} API success envelope mapping flattened wire response models.
 */
export async function getTalentController(
  req: NextRequest,
  context: { params: { id: string } },
): Promise<Response> {
  try {
    const userId = context?.params?.id;

    if (!userId) {
      throw new NotFoundError(
        "Target talent identifier path parameter is missing.",
      );
    }

    // 1. Inbound query execution through the relational service engine layers
    const { talent, user } = await CatalogService.getTalentByUserId({ userId });

    // 2. Transmute data row composites via the public storefront serializer
    const serializedDetail = CatalogSerializer.formatTalentDetail(talent, user);

    return ApiResponse.success(serializedDetail, 200);
  } catch (error) {
    return ApiResponse.handle(error);
  }
}
