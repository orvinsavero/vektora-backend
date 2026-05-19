/**
 * Global Base Application Error.
 * Serves as the fundamental root class for all structural, operational domain exceptions.
 * Extends the native JavaScript Error prototype to inject HTTP status layers.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  /**
   * @param {string} message - Human-readable structural error message.
   * @param {number} [statusCode=400] - Valid HTTP response status code mapping.
   * @param {boolean} [isOperational=true] - Marks flag to differentiate runtime exceptions from software bugs.
   */
  constructor(message: string, statusCode: number = 400, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Restore prototype chain for accurate runtime type checking and instance determinations
    Object.setPrototypeOf(this, new.target.prototype);

    // Exclude the constructor call from the generated stack trace to optimize debugging clarity
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Operational Validation Exception.
 * Thrown when incoming network request payload buffers fail structural validation,
 * schema parsing rules, or payload data-type invariants (HTTP 400 Bad Request).
 */
export class ValidationError extends AppError {
  /**
   * @param {string} [message="Validation failed."] - Specific validation failure message details.
   */
  constructor(message: string = "Validation failed.") {
    super(message, 400);
  }
}

/**
 * Operational Authentication Exception.
 * Indicates missing, malformed, or expired identity credentials or access tokens (HTTP 401 Unauthorized).
 */
export class UnauthorizedError extends AppError {
  /**
   * @param {string} [message="Authentication required."] - Identity context challenge details.
   */
  constructor(message: string = "Authentication required.") {
    super(message, 401);
  }
}

/**
 * Operational Authorization Exception.
 * Indicates valid identity context verification but insufficient security access permissions (HTTP 403 Forbidden).
 */
export class ForbiddenError extends AppError {
  /**
   * @param {string} [message="You do not have permission to access this resource."] - Access denial justification details.
   */
  constructor(
    message: string = "You do not have permission to access this resource.",
  ) {
    super(message, 403);
  }
}

/**
 * Operational Infrastructure Resource Entity Missing Exception.
 * Indicates a targeted database domain record pointer or system entity does not exist (HTTP 404 Not Found).
 */
export class NotFoundError extends AppError {
  /**
   * @param {string} [message="Requested resource was not found."] - Entity lookup criteria description details.
   */
  constructor(message: string = "Requested resource was not found.") {
    super(message, 404);
  }
}

/**
 * Operational State-Machine Conflict Exception.
 * Indicates data layer constraint violations or broken business engine lifecycle rules (HTTP 409 Conflict).
 */
export class ConflictError extends AppError {
  /**
   * @param {string} message - Description of the active business rule collision or unique constraint fault.
   */
  constructor(message: string) {
    super(message, 409);
  }
}
