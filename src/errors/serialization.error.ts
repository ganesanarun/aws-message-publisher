import { PublisherError } from './publisher.error';

/**
 * Error thrown when message serialization fails.
 * This error is thrown before attempting to publish the message.
 */
export class SerializationError extends PublisherError {
  /**
   * Creates a new SerializationError
   * @param message - Descriptive error message explaining the serialization failure
   * @param cause - Original error that caused this error (if any)
   */
  constructor(message: string, cause?: Error) {
    super(message, 'SERIALIZATION_ERROR', cause);
    this.name = 'SerializationError';
  }
}
