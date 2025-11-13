import { Logger } from '../interfaces/logger.interface';

/**
 * Captured log entry with level, message, and context.
 */
export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, any>;
}

/**
 * Test logger implementation that captures all log calls for assertion in tests.
 *
 * This logger is useful for verifying that your application logs correctly during
 * unit and integration tests. It stores all log calls in memory and provides
 * query methods to find specific log entries.
 *
 * @example
 * ```typescript
 * const testLogger = new TestLogger();
 * const publisher = new SnsMessagePublisher(snsClient);
 * publisher.configure(config => config
 *   .topicArn('test-topic')
 *   .logger(testLogger)
 * );
 *
 * await publisher.publish({ orderId: '123' });
 *
 * // Assert logs were captured
 * const infoLogs = testLogger.findByLevel('info');
 * expect(infoLogs).toHaveLength(1);
 * expect(infoLogs[0].message).toBe('Message published successfully');
 *
 * // Query by message
 * const publishLogs = testLogger.findByMessage('Publishing message');
 * expect(publishLogs).toHaveLength(1);
 *
 * // Clear for next test
 * testLogger.clear();
 * ```
 */
export class TestLogger implements Logger {
  /**
   * Array of all captured log entries.
   * Each entry contains the level, message, and optional context.
   */
  public logs: LogEntry[] = [];

  /**
   * Log a debug-level message and capture it for testing.
   *
   * @param message - Human-readable message describing the event
   * @param context - Optional structured context object
   */
  debug(message: string, context?: Record<string, any>): void {
    this.logs.push({ level: 'debug', message, context });
  }

  /**
   * Log an info-level message and capture it for testing.
   *
   * @param message - Human-readable message describing the event
   * @param context - Optional structured context object
   */
  info(message: string, context?: Record<string, any>): void {
    this.logs.push({ level: 'info', message, context });
  }

  /**
   * Log a warning-level message and capture it for testing.
   *
   * @param message - Human-readable message describing the warning
   * @param context - Optional structured context object
   */
  warn(message: string, context?: Record<string, any>): void {
    this.logs.push({ level: 'warn', message, context });
  }

  /**
   * Log an error-level message and capture it for testing.
   *
   * @param message - Human-readable message describing the error
   * @param context - Optional structured context object
   */
  error(message: string, context?: Record<string, any>): void {
    this.logs.push({ level: 'error', message, context });
  }

  /**
   * Clear all captured log entries.
   * Useful for resetting state between tests.
   *
   * @example
   * ```typescript
   * beforeEach(() => {
   *   testLogger.clear();
   * });
   * ```
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * Find all log entries matching the specified level.
   *
   * @param level - The log level to filter by ('debug', 'info', 'warn', 'error')
   * @returns Array of log entries matching the level
   *
   * @example
   * ```typescript
   * const errorLogs = testLogger.findByLevel('error');
   * expect(errorLogs).toHaveLength(1);
   * expect(errorLogs[0].message).toBe('Failed to publish message');
   * ```
   */
  findByLevel(level: 'debug' | 'info' | 'warn' | 'error'): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Find all log entries where the message contains the specified text.
   * The search is case-sensitive and uses substring matching.
   *
   * @param message - The message text to search for (substring match)
   * @returns Array of log entries with messages containing the search text
   *
   * @example
   * ```typescript
   * const publishLogs = testLogger.findByMessage('Publishing');
   * expect(publishLogs.length).toBeGreaterThan(0);
   *
   * const successLogs = testLogger.findByMessage('successfully');
   * expect(successLogs[0].context?.messageId).toBeDefined();
   * ```
   */
  findByMessage(message: string): LogEntry[] {
    return this.logs.filter(log => log.message.includes(message));
  }
}
