import { PublishOptions, BatchPublishOptions } from '../types';
import { PublishResult, BatchPublishResult } from '../types';

/**
 * Core interface for message publishers.
 * Supports publishing to AWS SNS and SQS with type-safe generics.
 */
export interface MessagePublisher<T> {
  /**
   * Publish a single message to the configured destination.
   *
   * @param message - The message to publish
   * @param options - Optional publish options
   * @returns Promise resolving to publish result with message ID
   */
  publish(message: T, options?: PublishOptions): Promise<PublishResult>;

  /**
   * Publish multiple messages in batch to the configured destination.
   * Automatically chunks messages to respect AWS batch size limits.
   *
   * @param messages - Array of messages to publish
   * @param options - Optional batch publish options
   * @returns Promise resolving to batch result with success/failure details
   */
  publishBatch(messages: T[], options?: BatchPublishOptions): Promise<BatchPublishResult>;

  /**
   * Configure the publisher using a fluent API.
   * Allows method chaining for readable configuration.
   *
   * @param callback - Configuration callback function that receives a configuration builder
   * @returns This publisher instance for method chaining
   */
  configure(callback: (config: any) => void): this;
}
