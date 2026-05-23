import { NextRequest } from "next/server";
import { updatePortfolioController } from "@/modules/catalog";
import { traceRoute } from "@/shared/interceptors/route-handler";
import { requireTalent } from "@/shared/interceptors/auth-guard";

/**
 * PATCH HTTP Handler for Mutating Targeted Portfolio Material Elements.
 * Intercepts parameters cleanly by resolving them at the route perimeter boundary.
 * Maps to: PATCH /api/catalog/portfolio/[id]
 */
export const PATCH = traceRoute(
  async (req: NextRequest, context: any): Promise<Response> => {
    // Wrap auth check inline so it can preserve lexical scope access to 'context'
    const authenticatedWorker = requireTalent(async (authReq) => {
      return updatePortfolioController(authReq, context);
    });

    return authenticatedWorker(req);
  },
);
