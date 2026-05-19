import { NextRequest, NextResponse } from "next/server";
import { logger } from "./logger.util";
import { ApiResponse } from "./response.util";
import { requestStorage } from "./request-context.util";

type VectorHandler = (req: NextRequest) => Promise<Response> | Response;

const isProduction = process.env.NODE_ENV === "production";

/**
 * Higher-Order Centralized Route Interceptor for Next.js App Router.
 * Hydrates standard AsyncLocalStorage tracking metrics and unifies request/response telemetry logs.
 */
export function traceRoute(handler: VectorHandler): VectorHandler {
  return async (req: NextRequest): Promise<Response> => {
    const startTime = performance.now();

    const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
    const bearerToken = req.headers.get("authorization") || null;
    const method = req.method;
    const url = new URL(req.url).pathname;

    return requestStorage.run({ requestId, bearerToken }, async () => {
      const logContext: Record<string, any> = {
        requestId,
        method,
        url,
        userAgent: req.headers.get("user-agent"),
      };

      if (bearerToken) {
        logContext.hasAuth = true;
      }

      // 1. Inbound trace log (Standard Metadata)
      logger.info(logContext, `--> INBOUND_REQUEST`);

      // 2. SAFE DEVELOPMENT PAYLOAD LOGGING
      // Only execute body parsing and logging outside of production environments
      if (!isProduction && ["POST", "PUT", "PATCH"].includes(method)) {
        try {
          // Clone the request stream so we don't consume the body buffer permanently
          const clonedReq = req.clone();
          const body = await clonedReq.json();

          // Create a copy of the payload to sanitize highly confidential keys
          const sanitizedBody = { ...body };
          if (sanitizedBody.password)
            sanitizedBody.password = "[REDACTED_SENSITIVE_CREDENTIAL]";
          if (sanitizedBody.passwordConfirmation)
            sanitizedBody.passwordConfirmation =
              "[REDACTED_SENSITIVE_CREDENTIAL]";

          logger.debug(
            { requestId, payload: sanitizedBody },
            `DEBUG_PAYLOAD: Inbound data context mapped for testing`,
          );
        } catch {
          // Fallback silently if the inbound body is not JSON or empty
        }
      }

      try {
        const response = await handler(req);
        const durationMs = parseFloat(
          (performance.now() - startTime).toFixed(2),
        );

        logger.info(
          { requestId, method, url, statusCode: response.status, durationMs },
          `<-- OUTBOUND_RESPONSE`,
        );

        response.headers.set("x-request-id", requestId);
        return response;
      } catch (error) {
        return ApiResponse.handle(error);
      }
    });
  };
}
