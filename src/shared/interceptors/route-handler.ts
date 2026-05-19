import { NextRequest } from "next/server";
import { logger } from "../telemetry/logger";
import { ApiResponse } from "../http/response";
import { requestStorage } from "../telemetry/context";

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

      // 1. Log Inbound Metadata
      logger.info(logContext, `--> INBOUND_REQUEST`);

      // 2. Log Inbound Payload (Development Only)
      if (!isProduction && ["POST", "PUT", "PATCH"].includes(method)) {
        try {
          const clonedReq = req.clone();
          const body = await clonedReq.json();

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
          // Fallback silently if request body is empty or non-JSON
        }
      }

      try {
        const response = await handler(req);
        const durationMs = parseFloat(
          (performance.now() - startTime).toFixed(2),
        );

        // 3. Log Outbound Payload (Development Only)
        if (!isProduction) {
          try {
            // Clone the response stream so the client can still read the original buffer cleanly
            const clonedRes = response.clone();
            const resBody = await clonedRes.json();

            logger.debug(
              { requestId, payload: resBody },
              `DEBUG_PAYLOAD: Outbound response context mapped for testing`,
            );
          } catch {
            // Fallback silently if response body is empty or non-JSON
          }
        }

        // 4. Log Outbound Metadata
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
