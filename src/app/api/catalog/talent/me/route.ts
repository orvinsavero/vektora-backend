import {
  AuthenticatedNextRequest,
  requireAuth,
} from "@/shared/interceptors/auth-guard";
import { getSelfTalentController } from "@/modules/catalog";
import { traceRoute } from "@/shared/interceptors/route-handler";

/**
 * Secure REST Routing Endpoint for Personal Talent Dashboard Storefronts.
 * Maps to: GET /api/catalog/talent/me
 */
export const GET = traceRoute(
  requireAuth(async (req: AuthenticatedNextRequest) => {
    return getSelfTalentController(req);
  }),
);
