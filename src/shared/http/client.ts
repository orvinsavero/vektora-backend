import { logger } from "../telemetry/logger";
import { getRequestContext } from "../telemetry/context";

interface HttpClientOptions extends RequestInit {
  contextName?: string;
}

export class HttpClient {
  static async request(
    url: string,
    options: HttpClientOptions = {},
  ): Promise<Response> {
    const { contextName = "ThirdPartyAPI", ...fetchOptions } = options;
    const { requestId } = getRequestContext();
    const method = fetchOptions.method || "GET";
    const startTime = performance.now();

    const customHeaders = new Headers(fetchOptions.headers);
    customHeaders.set("x-request-id", requestId);
    fetchOptions.headers = customHeaders;

    logger.debug(
      { requestId, context: contextName, method, url },
      `OUTBOUND EXTERNAL CALL INITIATED -> Forwarding Tracing Header Context.`,
    );

    try {
      const response = await fetch(url, fetchOptions);
      const durationMs = parseFloat((performance.now() - startTime).toFixed(2));

      logger.info(
        {
          requestId,
          context: contextName,
          method,
          url,
          statusCode: response.status,
          durationMs,
        },
        `OUTBOUND EXTERNAL CALL RESOLVED`,
      );

      return response;
    } catch (error) {
      const durationMs = parseFloat((performance.now() - startTime).toFixed(2));
      logger.error(
        {
          requestId,
          context: contextName,
          method,
          url,
          err: error,
          durationMs,
        },
        `OUTBOUND EXTERNAL CALL CRASHED`,
      );
      throw error;
    }
  }
}
