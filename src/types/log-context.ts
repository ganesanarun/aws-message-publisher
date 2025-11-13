/**
 * Structured context object for logging.
 *
 * LogContext represents additional metadata that can be attached to log messages.
 * This allows for structured logging where context fields can be queried and
 * filtered by log aggregation systems.
 *
 * The publisher supports two types of context:
 * - Static context: Configured once and included in all log messages
 * - Dynamic context: Provided per log statement and merged with static context
 *
 * When both static and dynamic context are present, dynamic context takes precedence
 * for overlapping keys.
 *
 * @example
 * ```typescript
 * // Static context - appears in all logs
 * publisher.configure(config => config
 *   .logContext({
 *     service: 'order-service',
 *     environment: 'production',
 *     version: '1.2.3'
 *   })
 * );
 *
 * // Dynamic context - merged with static context per log
 * logger.info('Order created', {
 *   orderId: '12345',
 *   customerId: '67890',
 *   amount: 99.99
 * });
 * // Result: { service: 'order-service', environment: 'production', version: '1.2.3', orderId: '12345', customerId: '67890', amount: 99.99 }
 * ```
 */
export type LogContext = Record<string, any>;
