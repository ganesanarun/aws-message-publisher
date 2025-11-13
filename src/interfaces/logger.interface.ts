/**
 * Minimal logger interface compatible with most logging frameworks.
 *
 * This interface is designed to work with popular logging frameworks like Winston, Pino,
 * Bunyan, console, and NestJS Logger without requiring adapters. Users pass their
 * already-configured logger instance, and the publisher emits structured log messages
 * that the logging framework formats according to its configuration.
 *
 * @example
 * ```typescript
 * // Using console
 * publisher.configure(config => config.logger(console));
 *
 * // Using Winston
 * const logger = winston.createLogger({ ... });
 * publisher.configure(config => config.logger(logger));
 *
 * // Using Pino
 * const logger = pino({ ... });
 * publisher.configure(config => config.logger(logger));
 * ```
 */
export interface Logger {
  /**
   * Log a debug-level message with optional structured context.
   *
   * Debug logs are used for detailed diagnostic information useful during development
   * and troubleshooting. The publisher uses debug logs for operations like enrichment
   * and serialization steps.
   *
   * @param message - Human-readable message describing the event
   * @param context - Optional structured context object. The logger is responsible
   *                  for formatting this object according to its configuration
   *                  (JSON, pretty print, OpenTelemetry, etc.)
   *
   * @example
   * ```typescript
   * logger.debug('Publishing message', {
   *   destination: 'arn:aws:sns:us-east-1:123456789012:my-topic',
   *   messageType: 'OrderCreated'
   * });
   * ```
   */
  debug(message: string, context?: Record<string, any>): void;

  /**
   * Log an info-level message with optional structured context.
   *
   * Info logs are used for general informational messages about normal operations.
   * The publisher uses info logs for successful operations like message publishing
   * and batch completions.
   *
   * @param message - Human-readable message describing the event
   * @param context - Optional structured context object. The logger is responsible
   *                  for formatting this object according to its configuration
   *                  (JSON, pretty print, OpenTelemetry, etc.)
   *
   * @example
   * ```typescript
   * logger.info('Message published successfully', {
   *   messageId: 'abc-123',
   *   destination: 'arn:aws:sns:us-east-1:123456789012:my-topic',
   *   duration: 45
   * });
   * ```
   */
  info(message: string, context?: Record<string, any>): void;

  /**
   * Log a warning-level message with optional structured context.
   *
   * Warning logs are used for potentially harmful situations that don't prevent
   * the operation from completing but may require attention.
   *
   * @param message - Human-readable message describing the warning
   * @param context - Optional structured context object. The logger is responsible
   *                  for formatting this object according to its configuration
   *                  (JSON, pretty print, OpenTelemetry, etc.)
   *
   * @example
   * ```typescript
   * logger.warn('Retry attempt failed', {
   *   attempt: 2,
   *   maxAttempts: 3,
   *   error: 'Throttling exception'
   * });
   * ```
   */
  warn(message: string, context?: Record<string, any>): void;

  /**
   * Log an error-level message with optional structured context.
   *
   * Error logs are used for error events that prevent an operation from completing
   * successfully. The publisher uses error logs for publishing failures and
   * configuration errors.
   *
   * @param message - Human-readable message describing the error
   * @param context - Optional structured context object. The logger is responsible
   *                  for formatting this object according to its configuration
   *                  (JSON, pretty print, OpenTelemetry, etc.)
   *
   * @example
   * ```typescript
   * logger.error('Failed to publish message', {
   *   error: { message: 'Topic not found', name: 'NotFound', stack: '...' },
   *   destination: 'arn:aws:sns:us-east-1:123456789012:my-topic',
   *   messageType: 'OrderCreated',
   *   duration: 120
   * });
   * ```
   */
  error(message: string, context?: Record<string, any>): void;
}
