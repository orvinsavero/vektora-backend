import {
  AuthenticatedNextRequest,
  requireTalent,
} from "@/shared/interceptors/auth-guard";
import { getSelfPortfoliosController } from "@/modules/catalog";
import { traceRoute } from "@/shared/interceptors/route-handler";

/**
 * Secure REST Endpoints for Personal Dashboard Portfolio Showcase views.
 * Maps to: GET /api/catalog/portfolio/talent/me
 */
export const GET = traceRoute(
  requireTalent(async (req: AuthenticatedNextRequest) => {
    return getSelfPortfoliosController(req);
  }),
);
