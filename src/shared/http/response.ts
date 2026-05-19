import { NextResponse } from "next/server";
import { AppError } from "../errors/app-error";
import { ZodError } from "zod";
import { logger } from "../telemetry/logger";
import { getRequestContext } from "../telemetry/context";

export interface ApiResponseEnvelope<T = any> {
  success: boolean;
  data: T | null;
  error: {
    message: string;
    details?: any;
  } | null;
  timestamp: string;
}

export class ApiResponse {
  static success<T>(
    data: T,
    statusCode: number = 200,
  ): NextResponse<ApiResponseEnvelope<T>> {
    const { requestId } = getRequestContext();

    const response = NextResponse.json(
      {
        success: true,
        data,
        error: null,
        timestamp: new Date().toISOString(),
      },
      { status: statusCode },
    );

    response.headers.set("x-request-id", requestId);
    return response;
  }

  static handle(error: unknown): NextResponse<ApiResponseEnvelope<null>> {
    const isProduction = process.env.NODE_ENV === "production";
    const timestamp = new Date().toISOString();
    const { requestId } = getRequestContext();

    if (error instanceof AppError) {
      const logPayload = {
        requestId,
        errType: error.constructor.name,
        statusCode: error.statusCode,
        isOperational: error.isOperational,
      };

      if (error.statusCode >= 500) {
        logger.error({ ...logPayload, err: error }, error.message);
      } else {
        logger.warn(logPayload, error.message);
      }

      return NextResponse.json(
        {
          success: false,
          data: null,
          error: { message: error.message },
          timestamp,
        },
        { status: error.statusCode },
      );
    }

    if (error instanceof ZodError) {
      logger.warn(
        { requestId, errType: "ZodValidationError" },
        "Invalid request payload constraints identified at perimeter boundary.",
      );

      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            message: "Invalid request payload constraints.",
            details: error.errors.map((err) => ({
              field: err.path.join("."),
              message: err.message,
            })),
          },
          timestamp,
        },
        { status: 400 },
      );
    }

    logger.error(
      {
        requestId,
        errType: error instanceof Error ? error.name : "UnknownSystemFault",
        err:
          error instanceof Error
            ? { message: error.message, stack: error.stack }
            : error,
      },
      "CRITICAL: FATAL SYSTEM EXHAUSTION BOUNDARY INTERCEPT",
    );

    const fallbackResponse = NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          message: isProduction
            ? "Internal server error. Please try again later."
            : error instanceof Error
              ? error.message
              : "Unknown internal error.",
        },
        timestamp,
      },
      { status: 500 },
    );

    fallbackResponse.headers.set("x-request-id", requestId);
    return fallbackResponse;
  }
}
