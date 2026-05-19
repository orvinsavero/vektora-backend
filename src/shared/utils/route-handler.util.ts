import { NextRequest, NextResponse } from "next/server";
import { logger } from "./logger.util";
import { ApiResponse } from "./response.util";
import { requestStorage } from "./request-context.util";

type VectorHandler = (req: NextRequest) => Promise<Response> | Response;

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

      logger.info(logContext, `--> INBOUND_REQUEST`);

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
