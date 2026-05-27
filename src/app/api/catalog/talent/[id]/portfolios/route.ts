import { NextRequest } from "next/server";
import { getTalentPortfoliosController } from "@/modules/catalog";
import { traceRoute } from "@/shared/interceptors/route-handler";

/**
 * Public GET HTTP Handler for Resolving a Specific Talent's Showcase Collections.
 * Maps to: GET /api/catalog/talent/portfolios/[id]
 */
export const GET = traceRoute(
  async (
    req: NextRequest,
    context: { params: { id: string } },
  ): Promise<Response> => {
    return getTalentPortfoliosController(req, context);
  },
);
