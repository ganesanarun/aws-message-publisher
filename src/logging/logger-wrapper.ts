import { Logger } from '../interfaces/logger.interface';
import { LogContext } from '../types/log-context';

/**
 * Internal wrapper that adds context merging and error isolation to a logger.
 *
 * LoggerWrapper wraps a user-provided logger and adds two key capabilities:
 * 1. Context Merging: Combines static context (configured once) with dynamic context
 *    (provided per log call), with dynamic context taking precedence
 * 2. Error Isolation: Ensures logging errors never interrupt publishing operations
 *
 * This class is used internally by the publisher and is not exported to users.
 *
 * @internal
 */
export class LoggerWrapper implements Logger {
  /**
   * Creates a new LoggerWrapper.
   *
   * @param logger - The underlying logger instance to wrap
   * @param staticContext - Optional static context fields that appear in all log messages
   */
  constructor(
    private readonly logger: Logger,
    private readonly staticContext: LogContext = {}
  ) {}

  /**
   * Log a debug-level message with context merging and error isolation.
   *
   * @param message - Human-readable message describing the event
   * @param context - Optional dynamic context that will be merged with static context
   */
  debug(message: string, context?: LogContext): void {
    this.safeLog(() => {
      const mergedContext = this.mergeContext(context);
      this.logger.debug(message, mergedContext);
    });
  }

  /**
   * Log an info-level message with context merging and error isolation.
   *
   * @param message - Human-readable message describing the event
   * @param context - Optional dynamic context that will be merged with static context
   */
  info(message: string, context?: LogContext): void {
    this.safeLog(() => {
      const mergedContext = this.mergeContext(context);
      this.logger.info(message, mergedContext);
    });
  }

  /**
   * Log a warning-level message with context merging and error isolation.
   *
   * @param message - Human-readable message describing the warning
   * @param context - Optional dynamic context that will be merged with static context
   */
  warn(message: string, context?: LogContext): void {
    this.safeLog(() => {
      const mergedContext = this.mergeContext(context);
      this.logger.warn(message, mergedContext);
    });
  }

  /**
   * Log an error-level message with context merging and error isolation.
   *
   * @param message - Human-readable message describing the error
   * @param context - Optional dynamic context that will be merged with static context
   */
  error(message: string, context?: LogContext): void {
    this.safeLog(() => {
      const mergedContext = this.mergeContext(context);
      this.logger.error(message, mergedContext);
    });
  }

  /**
   * Merges static context with dynamic context.
   *
   * Dynamic context takes precedence over static context for overlapping keys.
   * If no dynamic context is provided, returns the static context.
   *
   * @param dynamicContext - Optional dynamic context to merge
   * @returns Merged context object
   */
  private mergeContext(dynamicContext?: LogContext): LogContext {
    if (!dynamicContext) {
      return this.staticContext;
    }
    // Dynamic context overrides static context
    return { ...this.staticContext, ...dynamicContext };
  }

  /**
   * Executes a logging function with error isolation.
   *
   * If the logging function throws an error, it is caught and silently ignored
   * to ensure that logging errors never interrupt publishing operations.
   *
   * @param logFn - The logging function to execute safely
   */
  private safeLog(logFn: () => void): void {
    try {
      logFn();
    } catch (error) {
      // Silently ignore logging errors - never interrupt publishing
      // Logging failures should not affect the core publishing functionality
    }
  }
}
