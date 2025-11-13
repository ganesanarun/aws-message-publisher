import { Logger } from '../interfaces/logger.interface';

/**
 * Adapter to make NestJS Logger compatible with the publisher's Logger interface.
 *
 * NestJS Logger uses `log()` instead of `info()`, so this adapter bridges the gap.
 * This allows you to use NestJS Logger directly with the message publisher.
 *
 * @example
 * ```typescript
 * import { Logger as NestLogger } from '@nestjs/common';
 * import { SnsMessagePublisher, NestLoggerAdapter } from '@snow-tzu/aws-message-publisher';
 *
 * const nestLogger = new NestLogger('MessagePublisher');
 * const logger = new NestLoggerAdapter(nestLogger);
 *
 * const publisher = new SnsMessagePublisher(snsClient);
 * publisher.configure(config => config
 *   .topicArn('my-topic')
 *   .logger(logger)
 * );
 * ```
 */
export class NestLoggerAdapter implements Logger {
  /**
   * Create a new NestJS Logger adapter.
   *
   * @param nestLogger - The NestJS Logger instance is to adapt
   */
  constructor(private readonly nestLogger: NestLoggerInterface) {}

  /**
   * Log a debug-level message with an optional structured context.
   *
   * @param message - Human-readable message describing the event
   * @param context - Optional structured context object
   */
  debug(message: string, context?: Record<string, any>): void {
    this.nestLogger.debug(message, context);
  }

  /**
   * Log an info-level message with optional structured context.
   * Maps to NestJS Logger's log() method.
   *
   * @param message - Human-readable message describing the event
   * @param context - Optional structured context object
   */
  info(message: string, context?: Record<string, any>): void {
    // NestJS Logger uses log() instead of info()
    this.nestLogger.log(message, context);
  }

  /**
   * Log a warning-level message with optional structured context.
   *
   * @param message - Human-readable message describing the warning
   * @param context - Optional structured context object
   */
  warn(message: string, context?: Record<string, any>): void {
    this.nestLogger.warn(message, context);
  }

  /**
   * Log an error-level message with optional structured context.
   *
   * @param message - Human-readable message describing the error
   * @param context - Optional structured context object
   */
  error(message: string, context?: Record<string, any>): void {
    this.nestLogger.error(message, context);
  }
}

/**
 * Minimal interface representing NestJS Logger methods we need it.
 * This avoids requiring @nestjs/common as a dependency.
 */
interface NestLoggerInterface {
  log(message: any, context?: any): void;
  debug(message: any, context?: any): void;
  warn(message: any, context?: any): void;
  error(message: any, context?: any): void;
}
