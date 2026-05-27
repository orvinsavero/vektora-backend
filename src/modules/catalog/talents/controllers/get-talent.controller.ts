import { NextRequest } from "next/server";
import { TalentsService } from "../talents.service";
import { CatalogSerializer } from "../../_shared/response/catalog.serializer";
import { ApiResponse } from "@/shared/http/response";
import { NotFoundError } from "@/shared/errors/app-error";

/**
 * Controller Handler for Fetching Public Talent Storefront Profiles.
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

    const { talent, user } = await TalentsService.getTalentByUserId({ userId });
    const serializedDetail = CatalogSerializer.formatTalentDetail(talent, user);
    return ApiResponse.success(serializedDetail, 200);
  } catch (error) {
    return ApiResponse.handle(error);
  }
}
