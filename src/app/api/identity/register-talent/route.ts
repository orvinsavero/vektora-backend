import { registerTalentController } from "@/modules/identity/controllers/register-talent";
import { traceRoute } from "@/shared/interceptors/route-handler";
import { requireAuth } from "@/shared/interceptors/auth-guard";

/**
 * Entry Gate for Talent Profile Conversions.
 * Enforces cryptographic perimeter verification gates using secure HTTP-Only session lookups.
 */
export const POST = traceRoute(
  requireAuth(async (req) => {
    // TypeScript implicitly infers req as AuthenticatedNextRequest from requireAuth
    return registerTalentController(req);
  }),
);
