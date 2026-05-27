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
    context: { params: Promise<{ id: string }> },
  ): Promise<Response> => {
    const params = await context.params;
    return getTalentPortfoliosController(req, { params });
  },
);
