// src/app/api/identity/logout/route.ts
import { logoutController } from "@/modules/identity/index";
import { traceRoute } from "@/shared/interceptors/route-handler";
import { requireAuth } from "@/shared/interceptors/auth-guard";

/**
 * POST HTTP Handler for Ending User Sessions.
 * Protected by requireAuth to extract the specific active session key.
 */
export const POST = traceRoute(
  requireAuth(async (req) => {
    return logoutController(req);
  }),
);
