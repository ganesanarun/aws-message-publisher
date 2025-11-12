import { GetQueueUrlCommand, SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { MessagePublisher } from '../interfaces';
import {
  BatchPublishOptions,
  BatchPublishResult,
  FailedPublish,
  MessageAttributes,
  PublishContext,
  PublishOptions,
  PublishResult,
} from '../types';
import { SqsPublisherConfig, SqsPublisherConfiguration } from '../configuration';
import { EnrichmentPipeline } from '../pipeline';
import { ConfigurationError, PublishError } from '../errors';

/**
 * SQS message publisher implementation.
 * Publishes messages to AWS SQS queues with support for enrichment, serialization, and batch operations.
 */
export class SqsMessagePublisher<T = any> implements MessagePublisher<T> {
  private config?: SqsPublisherConfig;
  private enrichmentPipeline?: EnrichmentPipeline;
  private resolvedQueueUrl?: string;

  /**
   * Create a new SQS message publisher.
   *
   * @param sqsClient - AWS SQS client instance
   * @param config - Optional initial configuration
   */
  constructor(
    private readonly sqsClient: SQSClient,
    config?: SqsPublisherConfig
  ) {
    if (config) {
      this.applyConfiguration(config);
    }
  }

  /**
   * Configure the publisher using a fluent API.
   *
   * @param callback - Configuration callback that receives a configuration builder
   * @returns This publisher instance for method chaining
   * @example
   * publisher.configure(config => config
   *   .queueUrl('https://sqs.us-east-1.amazonaws.com/123456789/my-queue')
   *   .enrichers([new TraceEnricher(), new TimestampEnricher()])
   * );
   */
  configure(callback: (config: SqsPublisherConfiguration<T>) => void): this {
    const configBuilder = new SqsPublisherConfiguration<T>();
    callback(configBuilder);
    const builtConfig = configBuilder.build();
    this.applyConfiguration(builtConfig);
    return this;
  }

  /**
   * Resolve the queue URL from the configured destination.
   * Supports both full URLs and queue names.
   *
   * @returns Promise resolving to the full queue URL
   * @private
   */
  private async resolveQueueUrl(): Promise<string> {
    if (this.resolvedQueueUrl) {
      return this.resolvedQueueUrl;
    }

    const destination = this.config!.destination;

    // If it's already a full URL, use it as-is
    if (destination.startsWith('https://') || destination.startsWith('http://')) {
      this.resolvedQueueUrl = destination;
      return destination;
    }

    // Otherwise, it's a queue name - resolve to URL using GetQueueUrlCommand
    try {
      const command = new GetQueueUrlCommand({ QueueName: destination });
      const response = await this.sqsClient.send(command);

      if (!response.QueueUrl) {
        throw new ConfigurationError(
          `Failed to resolve queue name '${destination}' to URL: No queue URL returned`
        );
      }

      this.resolvedQueueUrl = response.QueueUrl;
      return this.resolvedQueueUrl;
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error;
      }
      throw new ConfigurationError(
        `Failed to resolve queue name '${destination}' to URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error as Error
      );
    }
  }

  /**
   * Resolve the publish context from the configured context resolver.
   * Returns an empty context if no resolver is configured (MVP behavior).
   *
   * @returns Promise resolving to the publish context
   * @private
   */
  private async resolveContext(): Promise<PublishContext> {
    if (this.config?.contextResolver) {
      return await this.config.contextResolver.resolve();
    }

    // Return empty context for MVP
    return {};
  }

  /**
   * Apply configuration to the publisher.
   *
   * @param config - Configuration to apply
   * @private
   */
  private applyConfiguration(config: SqsPublisherConfig): void {
    this.config = config;

    // Create enrichment pipeline if enrichers are configured
    if (config.enrichers && config.enrichers.length > 0) {
      this.enrichmentPipeline = new EnrichmentPipeline(config.enrichers);
    }

    // Reset resolved queue URL when configuration changes
    this.resolvedQueueUrl = undefined;
  }

  /**
   * Ensure the publisher is configured before use.
   *
   * @throws ConfigurationError if not configured
   * @private
   */
  private ensureConfigured(): void {
    if (!this.config) {
      throw new ConfigurationError(
        'Publisher must be configured before use. Call configure() first.'
      );
    }
  }

  /**
   * Publish a single message to the configured SQS queue.
   *
   * @param message - The message to publish
   * @param options - Optional publish options
   * @returns Promise resolving to publish result with message ID
   * @throws ConfigurationError if publisher is not configured
   * @throws PublishError if publishing fails
   */
  async publish(message: T, options?: PublishOptions): Promise<PublishResult> {
    this.ensureConfigured();

    try {
      // 1. Resolve queue URL
      const queueUrl = await this.resolveQueueUrl();

      // 2. Resolve context
      const context = await this.resolveContext();

      // 3. Enrich message
      const attributes = await this.enrichMessage(message, context, options?.messageAttributes);

      // 4. Serialize message
      const serialized = await this.config!.serializer!.serialize(message);

      // 5. Add content type to attributes
      const finalAttributes = this.addContentTypeAttribute(attributes, serialized.contentType);

      // 6. Publish to SQS
      const command = new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody:
          typeof serialized.body === 'string' ? serialized.body : serialized.body.toString('utf-8'),
        MessageAttributes: this.convertToSqsAttributes(finalAttributes),
        MessageDeduplicationId: options?.deduplicationId,
        MessageGroupId: options?.groupId,
        DelaySeconds: options?.delaySeconds,
      });

      const response = await this.sqsClient.send(command);

      return {
        messageId: response.MessageId!,
        sequenceNumber: response.SequenceNumber,
        destination: queueUrl,
        timestamp: new Date(),
      };
    } catch (error) {
      if (error instanceof PublishError || error instanceof ConfigurationError) {
        throw error;
      }
      throw new PublishError(
        `Failed to publish message to SQS: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.resolvedQueueUrl || this.config?.destination || 'unknown',
        error as Error
      );
    }
  }

  /**
   * Publish multiple messages in batch to the configured SQS queue.
   * Automatically chunks messages into batches of 10 (AWS SQS batch limit).
   *
   * @param messages - Array of messages to publish
   * @param options - Optional batch publish options
   * @returns Promise resolving to batch result with success/failure details
   * @throws ConfigurationError if publisher is not configured
   */
  async publishBatch(messages: T[], options?: BatchPublishOptions): Promise<BatchPublishResult> {
    this.ensureConfigured();

    const successful: PublishResult[] = [];
    const failed: FailedPublish[] = [];
    const continueOnError = options?.continueOnError ?? true;

    // SQS has a native batch API (SendMessageBatchCommand) but for MVP
    // we'll use the same approach as SNS: publish individually in chunks
    // This keeps the implementation consistent and simpler
    const chunkSize = 10;
    const chunks: T[][] = [];

    for (let i = 0; i < messages.length; i += chunkSize) {
      chunks.push(messages.slice(i, i + chunkSize));
    }

    for (const chunk of chunks) {
      const promises = chunk.map((message, indexInChunk) => {
        const originalIndex = chunks.indexOf(chunk) * chunkSize + indexInChunk;
        return this.publish(message, options)
          .then(result => ({ success: true, result, message, index: originalIndex }))
          .catch(error => ({ success: false, error, message, index: originalIndex }));
      });

      const results = await Promise.all(promises);

      for (const result of results) {
        if (result.success && 'result' in result) {
          successful.push(result.result);
        } else if (!result.success && 'error' in result) {
          failed.push({
            message: result.message,
            error: result.error,
            index: result.index,
          });

          if (!continueOnError) {
            // Return early if we should stop on first error
            return {
              successful,
              failed,
              totalCount: messages.length,
              successCount: successful.length,
              failureCount: failed.length,
            };
          }
        }
      }
    }

    return {
      successful,
      failed,
      totalCount: messages.length,
      successCount: successful.length,
      failureCount: failed.length,
    };
  }

  /**
   * Enrich the message with metadata attributes using the enrichment pipeline.
   *
   * @param message - The message being published
   * @param context - The publish context
   * @param additionalAttributes - Optional additional attributes from publish options
   * @returns Promise resolving to merged message attributes
   * @private
   */
  private async enrichMessage(
    message: T,
    context: PublishContext,
    additionalAttributes?: MessageAttributes
  ): Promise<MessageAttributes> {
    let attributes: MessageAttributes = {};

    // Apply enrichers if configured
    if (this.enrichmentPipeline) {
      attributes = await this.enrichmentPipeline.enrich(message, context);
    }

    // Merge with additional attributes from options (these take precedence)
    if (additionalAttributes) {
      attributes = { ...attributes, ...additionalAttributes };
    }

    return attributes;
  }

  /**
   * Add content type attribute to message attributes.
   *
   * @param attributes - Existing message attributes
   * @param contentType - Content type from serializer
   * @returns Message attributes with content type added
   * @private
   */
  private addContentTypeAttribute(
    attributes: MessageAttributes,
    contentType: string
  ): MessageAttributes {
    return {
      ...attributes,
      contentType: {
        dataType: 'String',
        value: contentType,
      },
    };
  }

  /**
   * Convert internal message attributes to SQS message attribute format.
   *
   * @param attributes - Internal message attributes
   * @returns SQS-compatible message attributes
   * @private
   */
  private convertToSqsAttributes(attributes: MessageAttributes): Record<string, any> {
    const sqsAttributes: Record<string, any> = {};

    for (const [key, value] of Object.entries(attributes)) {
      sqsAttributes[key] = {
        DataType: value.dataType,
        StringValue: value.dataType === 'String' ? String(value.value) : undefined,
        BinaryValue: value.dataType === 'Binary' ? value.value : undefined,
      };

      // For Number type, SQS expects it as a String with DataType 'Number'
      if (value.dataType === 'Number') {
        sqsAttributes[key].StringValue = String(value.value);
      }
    }

    return sqsAttributes;
  }
}
