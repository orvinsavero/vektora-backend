import { NextRequest } from "next/server";
import { registerUserController } from "@/modules/identity/users/controllers/register-user.controller";
import { traceRoute } from "@/shared/interceptors/route-handler";

/**
 * Entry Gate for New User Registrations.
 * Routes raw network inbound payloads directly into the identity module domain logic controllers
 * under centralized telemetry tracing interceptors.
 */
export const POST = traceRoute(async (req: NextRequest): Promise<Response> => {
  return registerUserController(req);
});
