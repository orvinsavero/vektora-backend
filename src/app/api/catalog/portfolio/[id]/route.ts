import { NextRequest } from "next/server";
import {
  deletePortfolioController,
  updatePortfolioController,
  getPortfolioController,
} from "@/modules/catalog";
import { traceRoute } from "@/shared/interceptors/route-handler";
import { requireTalent } from "@/shared/interceptors/auth-guard";

/**
 * Public GET HTTP Handler for Hydrating an Individual Portfolio Showcase Card.
 * Maps to: GET /api/catalog/portfolio/[id]
 */
export const GET = traceRoute(
  async (
    req: NextRequest,
    context: { params: Promise<{ id: string }> },
  ): Promise<Response> => {
    const params = await context.params;

    return getPortfolioController(req, { params });
  },
);

/**
 * PATCH HTTP Handler for Mutating Targeted Portfolio Material Elements.
 * Intercepts parameters cleanly by resolving them at the route perimeter boundary.
 * Maps to: PATCH /api/catalog/portfolio/[id]
 */
export const PATCH = traceRoute(
  async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const params = await context.params;
    const authenticatedWorker = requireTalent(async (authReq) => {
      return updatePortfolioController(authReq, { params });
    });

    return authenticatedWorker(req);
  },
);

/**
 * DELETE HTTP Handler for Purging Targeted Portfolio Records.
 * Capped behind requireTalent authorization security walls.
 * Maps to: DELETE /api/catalog/portfolio/[id]
 */
export const DELETE = traceRoute(
  async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const params = await context.params;
    const authenticatedWorker = requireTalent(async (authReq) => {
      return deletePortfolioController(authReq, { params });
    });
    return authenticatedWorker(req);
  },
);
