/**
 * Result of a successful message publish operation.
 */
export interface PublishResult {
  /**
   * Unique identifier assigned by AWS for the published message
   */
  messageId: string;

  /**
   * Sequence number for FIFO queues/topics (if applicable)
   */
  sequenceNumber?: string;

  /**
   * Destination where the message was published (topic ARN or queue URL)
   */
  destination: string;

  /**
   * Timestamp when the message was published
   */
  timestamp: Date;
}

/**
 * Details of a failed message publish in a batch operation.
 */
export interface FailedPublish {
  /**
   * The message that failed to publish
   */
  message: any;

  /**
   * The error that caused the failure
   */
  error: Error;

  /**
   * Index of the failed message in the original batch
   */
  index: number;
}

/**
 * Result of a batch publish operation.
 */
export interface BatchPublishResult {
  /**
   * Successfully published messages with their results
   */
  successful: PublishResult[];

  /**
   * Failed messages with error details
   */
  failed: FailedPublish[];

  /**
   * Total number of messages in the batch
   */
  totalCount: number;

  /**
   * Number of successfully published messages
   */
  successCount: number;

  /**
   * Number of failed messages
   */
  failureCount: number;
}
