import { NextRequest } from "next/server";
import { getTalentController } from "@/modules/catalog";
import { traceRoute } from "@/shared/interceptors/route-handler";

/**
 * Public REST Routing Endpoint for Individual Storefront Profile Lookups.
 * Maps to: GET /api/catalog/talent/[id]
 */
export const GET = traceRoute(
  async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const params = await context.params;

    return getTalentController(req, { params });
  },
);
