// src/app/api/catalog/talent/profile/route.ts
import {
  AuthenticatedNextRequest,
  requireAuth,
} from "@/shared/interceptors/auth-guard";
import { updateTalentProfileController } from "@/modules/catalog";
import { traceRoute } from "@/shared/interceptors/route-handler";

/**
 * Secure REST Routing Endpoint for Mutating Talent Storefront Showcase Settings.
 * Maps to: PATCH /api/catalog/talent/profile
 */
export const PATCH = traceRoute(
  requireAuth(async (req: AuthenticatedNextRequest) => {
    return updateTalentProfileController(req);
  }),
);
