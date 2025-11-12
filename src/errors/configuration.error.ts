import { PublisherError } from './publisher.error';

/**
 * Error thrown when publisher configuration is invalid or incomplete.
 * This error is thrown immediately during configuration validation.
 */
export class ConfigurationError extends PublisherError {
  /**
   * Creates a new ConfigurationError
   * @param message - Descriptive error message explaining the configuration issue
   * @param cause - Original error that caused this error (if any)
   */
  constructor(message: string, cause?: Error) {
    super(message, 'CONFIGURATION_ERROR', cause);
    this.name = 'ConfigurationError';
  }
}
