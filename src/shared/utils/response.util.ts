import { NextResponse } from "next/server";
import { AppError } from "../errors/app-error";
import { ZodError } from "zod";
import { logger } from "./logger.util";

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
  /**
   * Encapsulates data results within a standardized success layout protocol.
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
   * Intercepts, classifies, and serializes exceptions into consistent error response payloads.
   */
  static handle(error: unknown): NextResponse<ApiResponseEnvelope<null>> {
    const isProduction = process.env.NODE_ENV === "production";

    // Branch A: Catch-all block for explicit application layer operational errors
    if (error instanceof AppError) {
      logger.warn(
        {
          errType: error.constructor.name,
          statusCode: error.statusCode,
        },
        error.message,
      );

      return NextResponse.json(
        {
          success: false,
          data: null,
          error: { message: error.message },
          timestamp: new Date().toISOString(),
        },
        { status: error.statusCode },
      );
    }

    // Branch B: Catch-all block for validation parsing constraint failures
    if (error instanceof ZodError) {
      logger.warn(
        { errType: "ZodValidationError" },
        "Invalid request payload constraints.",
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
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      );
    }

    // Branch C: Unhandled system faults or infrastructure-level crash exceptions
    logger.error({ err: error }, "➔ [FATAL SYSTEM CRASH]");

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
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
