import { NextResponse } from "next/server";
import { AppError } from "../errors/app-error";
import { ZodError } from "zod";
import { logger } from "./logger.util";

/**
 * Standard Envelope Protocol for Public API Responses.
 * Guarantees a predictable wire format for frontends and consumers.
 */
export interface ApiResponseEnvelope<T = any> {
  success: boolean;
  data: T | null;
  error: {
    message: string;
    details?: any;
  } | null;
  timestamp: string;
}

/**
 * Unified Boundary Response and Global Exception Handler.
 * Intercepts execution yields at the API perimeter to structure payloads and log system state shifts.
 */
export class ApiResponse {
  /**
   * Encapsulates data results within a standardized success layout protocol.
   * * @param {T} data - Main response cargo entity payload.
   * @param {number} [statusCode=200] - Inbound HTTP response confirmation code.
   * @returns {NextResponse<ApiResponseEnvelope<T>>} Structured Next.js response proxy.
   */
  static success<T>(
    data: T,
    statusCode: number = 200,
  ): NextResponse<ApiResponseEnvelope<T>> {
    return NextResponse.json(
      {
        success: true,
        data,
        error: null,
        timestamp: new Date().toISOString(),
      },
      { status: statusCode },
    );
  }

  /**
   * Intercepts, classifies, and serializes system exceptions into consistent wire errors.
   * Dynamically switches logging priority layers based on operational severity.
   * * @param {unknown} error - Caught anomaly exception or raw thrown structure.
   * @returns {NextResponse<ApiResponseEnvelope<null>>} Structured Next.js error response proxy.
   */
  static handle(error: unknown): NextResponse<ApiResponseEnvelope<null>> {
    const isProduction = process.env.NODE_ENV === "production";
    const timestamp = new Date().toISOString();

    // Branch A: Catch-all block for explicit application-level operational errors
    if (error instanceof AppError) {
      const logPayload = {
        errType: error.constructor.name,
        statusCode: error.statusCode,
        isOperational: error.isOperational,
      };

      /**
       * Dynamically shift log levels based on HTTP status codes.
       * 4xx client infractions are warnings; anything else indicates an unexpected error path.
       */
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

    // Branch B: Catch-all block for validation parsing constraint failures
    if (error instanceof ZodError) {
      logger.warn(
        { errType: "ZodValidationError" },
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

    // Branch C: Unhandled system faults, un-caught engine panics, or database connectivity losses
    logger.error(
      {
        errType: error instanceof Error ? error.name : "UnknownSystemFault",
        err:
          error instanceof Error
            ? { message: error.message, stack: error.stack }
            : error,
      },
      "➔ [FATAL SYSTEM EXHUSTION BOUNDARY INTERCEPT]",
    );

    return NextResponse.json(
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
  }
}
