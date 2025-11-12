/**
 * Configuration for retry behavior on failed publish operations.
 */
export interface RetryPolicy {
  /**
   * Maximum number of retry attempts
   */
  maxRetries: number;

  /**
   * Backoff strategy for calculating retry delays
   * - 'exponential': Delay doubles with each retry (100ms, 200ms, 400ms, ...)
   * - 'linear': Delay increases linearly (100ms, 200ms, 300ms, ...)
   */
  backoffStrategy: 'exponential' | 'linear';

  /**
   * Initial delay in milliseconds before first retry
   * Default: 100ms
   */
  initialDelayMs?: number;

  /**
   * Maximum delay in milliseconds between retries
   * Default: 30000ms (30 seconds)
   */
  maxDelayMs?: number;

  /**
   * List of AWS error codes that should trigger a retry.
   * If not specified, defaults to common transient errors:
   * - ServiceUnavailable
   * - Throttling
   * - RequestTimeout
   */
  retryableErrors?: string[];
}
