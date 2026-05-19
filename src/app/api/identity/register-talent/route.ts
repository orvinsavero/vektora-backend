import { NextRequest } from "next/server";
import { registerTalentController } from "@/modules/identity/controllers/register-talent";
import { traceRoute } from "@/shared/interceptors/route-handler";

/**
 * Entry Gate for Talent Profile Conversions.
 * Intercepts incoming user account contextual upgrades and tracks performance telemetry metrics natively.
 */
export const POST = traceRoute(async (req: NextRequest): Promise<Response> => {
  return registerTalentController(req);
});
