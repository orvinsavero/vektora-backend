import { NextRequest } from "next/server";
import { db, dbStorage } from "@/db";
import { IdentityService } from "@/modules/identity/identity.service";
import { registerUserSchema } from "@/modules/identity/validators";
import { IdentitySerializer } from "@/modules/identity/serializers";
import { ApiResponse } from "@/shared/utils/response.util";
import { ValidationError } from "@/shared/errors/app-error";

/**
 * Endpoint Handler for New User Profile Registrations.
 * Intercepts inbound account creation payloads, executes structural validation policies,
 * hashes plaintext credentials, and safely commits records inside an isolated transaction.
 *
 * @param {NextRequest} req - Inbound framework request stream proxy.
 * @returns {Promise<Response>} Structured serialization response envelope.
 */
export async function POST(req: NextRequest): Promise<Response> {
  try {
    let body: unknown;

    try {
      // Parse raw stream buffer into JSON context primitives
      body = await req.json();
    } catch {
      /**
       * Throws a native ValidationError to signal bad JSON payload formatting.
       * Automatically maps upstream to a clean 400 response code.
       */
      throw new ValidationError("Invalid JSON payload formatting.");
    }

    // Execute field constraint checks at the perimeter boundary layer
    const validationResult = registerUserSchema.safeParse(body);

    if (!validationResult.success) {
      return ApiResponse.handle(validationResult.error);
    }

    /**
     * Enforce Boundary Transaction Isolation.
     * Guarantees that the user lookup, validation check, and table mutations
     * execute within a single atomic database context transaction block.
     */
    const sanitizedUser = await db.transaction(async (tx) => {
      return await dbStorage.run(tx, async () => {
        // Pass the validated payload down through the transaction sandbox proxy
        const rawUser = await IdentityService.registerNewUser(
          validationResult.data,
          tx,
        );

        // Enforce structural translation mapping rules prior to escaping isolation limits
        return IdentitySerializer.formatUser(rawUser);
      });
    });

    return ApiResponse.success(sanitizedUser, 201);
  } catch (error) {
    // Catch-all block channels domain-specific exceptions directly to structural JSON wrappers
    return ApiResponse.handle(error);
  }
}
