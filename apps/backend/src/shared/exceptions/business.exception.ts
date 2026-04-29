/**
 * Base exception for business rule violations
 * Default HTTP status: 400 Bad Request
 */
export class BusinessException extends Error {
  public readonly name = 'BusinessException';
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, any>;

  constructor(
    message: string,
    code: string,
    details?: Record<string, any>,
    statusCode: number = 400,
  ) {
    super(message);
    this.code = code;
    this.details = details;
    this.statusCode = statusCode;

    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    const json: any = {
      statusCode: this.statusCode,
      message: this.message,
      code: this.code,
    };

    if (this.details) {
      json.details = this.details;
    }

    return json;
  }
}
