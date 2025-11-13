import { Logger } from '../interfaces/logger.interface';

/**
 * No-operation logger that produces no output.
 *
 * This is the default logger used when no logger is configured. It implements
 * the Logger interface with empty methods, ensuring zero overhead and no
 * unexpected output when logging is not explicitly enabled.
 *
 * The NoOpLogger allows the publisher to operate silently by default, with
 * users opting in to logging by providing their own logger instance.
 *
 * @example
 * ```typescript
 * // Used internally as default
 * const logger = new NoOpLogger();
 * logger.info('This produces no output');
 *
 * // Users can also use it explicitly if needed
 * publisher.configure(config => config.logger(new NoOpLogger()));
 * ```
 */
export class NoOpLogger implements Logger {
  /**
   * No-op debug method. Does nothing.
   *
   * @param _message - Ignored
   * @param _context - Ignored
   */
  debug(_message: string, _context?: Record<string, any>): void {
    // Intentionally empty - no operation performed
  }

  /**
   * No-op info method. Does nothing.
   *
   * @param _message - Ignored
   * @param _context - Ignored
   */
  info(_message: string, _context?: Record<string, any>): void {
    // Intentionally empty - no operation performed
  }

  /**
   * No-op warn method. Does nothing.
   *
   * @param _message - Ignored
   * @param _context - Ignored
   */
  warn(_message: string, _context?: Record<string, any>): void {
    // Intentionally empty - no operation performed
  }

  /**
   * No-op error method. Does nothing.
   *
   * @param _message - Ignored
   * @param _context - Ignored
   */
  error(_message: string, _context?: Record<string, any>): void {
    // Intentionally empty - no operation performed
  }
}
