import { MessageAttributes } from './message-attributes';

/**
 * Options for publishing a single message.
 */
export interface PublishOptions {
  /**
   * Override or add to default message attributes
   */
  messageAttributes?: MessageAttributes;

  /**
   * Message deduplication ID for FIFO queues/topics.
   * Required for FIFO destinations without content-based deduplication.
   */
  deduplicationId?: string;

  /**
   * Message group ID for FIFO queues/topics.
   * Messages with the same group ID are processed in order.
   */
  groupId?: string;

  /**
   * Delay in seconds before the message becomes available (SQS only).
   * Valid values: 0 to 900 (15 minutes)
   */
  delaySeconds?: number;
}

/**
 * Options for publishing multiple messages in batch.
 */
export interface BatchPublishOptions extends PublishOptions {
  /**
   * Continue processing remaining messages if some fail.
   * If false, stops on first failure.
   * Default: true
   */
  continueOnError?: boolean;
}
