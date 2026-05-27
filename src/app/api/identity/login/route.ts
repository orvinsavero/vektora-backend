import { NextRequest } from "next/server";
import { loginController } from "@/modules/identity/auth/controllers/login.controller";
import { traceRoute } from "@/shared/interceptors/route-handler";

/**
 * Entry Gate for Identity Session Authentication.
 * Routes incoming payloads directly to the vertical feature module under telemetry tracing.
 */
export const POST = traceRoute(async (req: NextRequest): Promise<Response> => {
  return loginController(req);
});
