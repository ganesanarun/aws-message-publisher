/**
 * Base error class for all publisher-related errors.
 * Provides a consistent error structure with error codes and cause tracking.
 */
export class PublisherError extends Error {
  /**
   * Creates a new PublisherError
   * @param message - Descriptive error message
   * @param code - Error code for programmatic error handling
   * @param cause - Original error that caused this error (if any)
   */
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'PublisherError';

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
