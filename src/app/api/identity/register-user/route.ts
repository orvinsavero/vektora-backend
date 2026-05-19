import { NextRequest } from "next/server";
import { registerUserController } from "@/modules/identity/controllers/register-user";
import { traceRoute } from "@/shared/interceptors/route-handler";

// The route infrastructure layer remains 100% declarative and readable
export const POST = traceRoute(async (req: NextRequest): Promise<Response> => {
  return registerUserController(req);
});
