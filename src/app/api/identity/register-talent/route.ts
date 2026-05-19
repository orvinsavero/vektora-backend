import { NextRequest } from "next/server";
import { db, dbStorage } from "@/db";
import { IdentityService } from "@/modules/identity/identity.service";
import { registerTalentSchema } from "@/modules/identity/validators";
import { IdentitySerializer } from "@/modules/identity/serializers";
import { ApiResponse } from "@/shared/utils/response.util";
import { ValidationError } from "@/shared/errors/app-error"; // Uses your valid native class

/**
 * Endpoint Handler for Talent Profile Conversions.
 * Intercepts incoming user account contextual upgrades, enforces strict validation bounds,
 * and executes structural state migrations inside a secure transactional boundary.
 *
 * @param {NextRequest} req - Inbound framework request stream proxy.
 * @returns {Promise<Response>} Structured serialization response envelope.
 */
export async function POST(req: NextRequest): Promise<Response> {
  try {
    let body: unknown;

    try {
      body = await req.json();
    } catch {
      /**
       * Throws a native ValidationError to signal bad JSON payload formatting.
       * Automatically maps upstream to a clean 400 response code.
       */
      throw new ValidationError("Invalid JSON payload formatting.");
    }

    const validationResult = registerTalentSchema.safeParse(body);

    if (!validationResult.success) {
      return ApiResponse.handle(validationResult.error);
    }

    const sanitizedTalent = await db.transaction(async (tx) => {
      return await dbStorage.run(tx, async () => {
        const rawTalent = await IdentityService.registerAsTalent(
          validationResult.data,
          tx,
        );
        return IdentitySerializer.formatTalent(rawTalent);
      });
    });

    return ApiResponse.success(sanitizedTalent, 201);
  } catch (error) {
    return ApiResponse.handle(error);
  }
}
