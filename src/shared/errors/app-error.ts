export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

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

// Operational exception thrown when incoming request payloads fail structural or value invariants
export class ValidationError extends AppError {
  constructor(message: string = "Validation failed.") {
    super(message, 400);
  }
}

// Operational exception indicating missing, malformed, or expired identity credentials
export class UnauthorizedError extends AppError {
  constructor(message: string = "Authentication required.") {
    super(message, 401);
  }
}

// Operational exception indicating sufficient identification but insufficient authorization privileges
export class ForbiddenError extends AppError {
  constructor(
    message: string = "You do not have permission to access this resource.",
  ) {
    super(message, 403);
  }
}

// Operational exception indicating a targeted domain entity or record pointer does not exist
export class NotFoundError extends AppError {
  constructor(message: string = "Requested resource was not found.") {
    super(message, 404);
  }
}

// Operational exception indicating unique constraints or state-machine business rule conflicts
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}
