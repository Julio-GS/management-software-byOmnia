/**
 * Base exception for technical/infrastructure failures
 * Default HTTP status: 500 Internal Server Error
 */
export class TechnicalException extends Error {
  public readonly name = 'TechnicalException';
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, any>;

  constructor(
    message: string,
    code: string,
    details?: Record<string, any>,
    statusCode: number = 500,
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

    // Mask sensitive details in production
    if (this.details && process.env.NODE_ENV !== 'production') {
      json.details = this.details;
    }

    return json;
  }
}
