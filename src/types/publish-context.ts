/**
 * Runtime context information for message publishing.
 * Contains metadata extracted from the execution environment.
 */
export interface PublishContext {
  /**
   * Correlation ID for tracking related messages across services
   */
  correlationId?: string;

  /**
   * Trace ID for distributed tracing across system boundaries
   */
  traceId?: string;

  /**
   * User ID of the user who initiated the message publishing
   */
  userId?: string;

  /**
   * Environment where the message is being published (e.g., 'development', 'staging', 'production')
   */
  environment?: string;

  /**
   * Custom attributes for application-specific context
   */
  customAttributes?: Record<string, any>;
}
