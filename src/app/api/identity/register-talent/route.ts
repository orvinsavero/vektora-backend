import { NextRequest } from "next/server";
import { registerTalentController } from "@/modules/identity/controllers/register-talent";
import { traceRoute } from "@/shared/interceptors/route-handler";
import {
  requireAuth,
  AuthenticatedNextRequest,
} from "@/shared/interceptors/auth-guard";

/**
 * Entry Gate for Talent Profile Conversions.
 * Enforces cryptographic perimeter verification gates using secure HTTP-Only session lookups.
 */
export const POST = traceRoute(
  requireAuth(async (req: NextRequest): Promise<Response> => {
    return registerTalentController(req as AuthenticatedNextRequest);
  }),
);
