import {
  getProfileController,
  updateProfileController,
} from "@/modules/identity/index";
import { traceRoute } from "@/shared/interceptors/route-handler";
import { requireAuth } from "@/shared/interceptors/auth-guard";

/**
 * GET HTTP Handler for Personal Account Resource Configurations.
 * Enforces verified cryptographically signed session token extraction before enabling lookups.
 */
export const GET = traceRoute(
  requireAuth(async (req) => {
    return getProfileController(req);
  }),
);

/**
 * PATCH HTTP Handler for Dynamic Personal Profile Modifications.
 * Evaluates request token contexts and parses whitelisted payload body elements.
 */
export const PATCH = traceRoute(
  requireAuth(async (req) => {
    return updateProfileController(req);
  }),
);
