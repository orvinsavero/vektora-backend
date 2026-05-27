// src/app/api/catalog/categories/route.ts
import { NextRequest } from "next/server";
import { getCategoriesController } from "@/modules/catalog";
import { traceRoute } from "@/shared/interceptors/route-handler";

/**
 * Public REST Routing Endpoint for Fetching Marketplace Discovery Hierarchies.
 * Maps to: GET /api/catalog/categories
 */
export const GET = traceRoute(async (req: NextRequest): Promise<Response> => {
  return getCategoriesController(req);
});
