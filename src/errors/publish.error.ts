import { PublisherError } from './publisher.error';

/**
 * Error thrown when message publishing to AWS SNS or SQS fails.
 * This error wraps AWS errors with additional context and can be retried if a retry policy is configured.
 */
export class PublishError extends PublisherError {
  /**
   * Creates a new PublishError
   * @param message - Descriptive error message explaining the publish failure
   * @param destination - The SNS topic ARN or SQS queue URL that was the target
   * @param cause - Original AWS error that caused this error (if any)
   */
  constructor(
    message: string,
    public readonly destination: string,
    cause?: Error
  ) {
    super(message, 'PUBLISH_ERROR', cause);
    this.name = 'PublishError';
  }
}
