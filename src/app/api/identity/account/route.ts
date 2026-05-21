import { updateAccountController } from "@/modules/identity/index";
import { traceRoute } from "@/shared/interceptors/route-handler";
import { requireAuth } from "@/shared/interceptors/auth-guard";

/**
 * PUT HTTP Handler for Sensitive Account Credentials Modification.
 */
export const PUT = traceRoute(
  requireAuth(async (req) => {
    return updateAccountController(req);
  }),
);
