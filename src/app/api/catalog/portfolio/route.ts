// src/app/api/catalog/portfolio/route.ts
import { createPortfolioController } from "@/modules/catalog";
import { traceRoute } from "@/shared/interceptors/route-handler";
import { requireTalent } from "@/shared/interceptors/auth-guard";

/**
 * POST HTTP Handler for Provisioning Fresh Creative Portfolio Materials.
 * Capped behind requireTalent contextual status authorization walls.
 * Maps to: POST /api/catalog/portfolio
 */
export const POST = traceRoute(
  requireTalent(async (req) => {
    return createPortfolioController(req);
  }),
);
