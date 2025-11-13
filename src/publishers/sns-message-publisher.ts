import { CreateTopicCommand, PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { Logger, MessagePublisher } from '../interfaces';
import {
  BatchPublishOptions,
  BatchPublishResult,
  FailedPublish,
  MessageAttributes,
  PublishContext,
  PublishOptions,
  PublishResult,
} from '../types';
import { SnsPublisherConfig, SnsPublisherConfiguration } from '../configuration';
import { EnrichmentPipeline } from '../pipeline';
import { ConfigurationError, PublishError } from '../errors';
import { NoOpLogger } from '../logging/no-op-logger';

/**
 * SNS message publisher implementation.
 * Publishes messages to AWS SNS topics with support for enrichment, serialization, and batch operations.
 */
export class SnsMessagePublisher<T = any> implements MessagePublisher<T> {
  private config?: SnsPublisherConfig;
  private enrichmentPipeline?: EnrichmentPipeline;
  private resolvedTopicArn?: string;
  private logger: Logger = new NoOpLogger();

  /**
   * Create a new SNS message publisher.
   *
   * @param snsClient - AWS SNS client instance
   * @param config - Optional initial configuration
   */
  constructor(
    private readonly snsClient: SNSClient,
    config?: SnsPublisherConfig
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
   *   .topicArn('arn:aws:sns:us-east-1:123456789:my-topic')
   *   .enrichers([new TraceEnricher(), new TimestampEnricher()])
   * );
   */
  configure(callback: (config: SnsPublisherConfiguration<T>) => void): this {
    const configBuilder = new SnsPublisherConfiguration<T>();
    callback(configBuilder);
    const builtConfig = configBuilder.build();
    this.applyConfiguration(builtConfig);
    return this;
  }

  /**
   * Publish a single message to the configured SNS topic.
   *
   * @param message - The message to publish
   * @param options - Optional publish options
   * @returns Promise resolving to publish result with message ID
   * @throws ConfigurationError if publisher is not configured
   * @throws PublishError if publishing fails
   */
  async publish(message: T, options?: PublishOptions): Promise<PublishResult> {
    this.ensureConfigured();

    const startTime = Date.now();
    let topicArn: string | undefined;

    try {
      // 1. Resolve topic ARN
      topicArn = await this.resolveTopicArn();

      // Log start of publishing
      this.logger.debug('Publishing message', {
        destination: topicArn,
        messageType: message?.constructor?.name || typeof message,
      });

      // 2. Resolve context
      const context = await this.resolveContext();

      // 3. Enrich message
      if (this.enrichmentPipeline && this.config!.enrichers && this.config!.enrichers.length > 0) {
        this.logger.debug('Applying enrichers', {
          enricherCount: this.config!.enrichers.length,
          enricherNames: this.config!.enrichers.map(e => e.constructor.name),
        });
      }
      const attributes = await this.enrichMessage(message, context, options?.messageAttributes);

      // 4. Serialize message
      const serializerType = this.config!.serializer!.constructor.name;
      const serialized = await this.config!.serializer!.serialize(message);
      this.logger.debug('Serializing message', {
        serializerType,
        contentType: serialized.contentType,
      });

      // 5. Add content type to attributes
      const finalAttributes = this.addContentTypeAttribute(attributes, serialized.contentType);

      // 6. Publish to SNS
      const command = new PublishCommand({
        TopicArn: topicArn,
        Message:
          typeof serialized.body === 'string' ? serialized.body : serialized.body.toString('utf-8'),
        MessageAttributes: this.convertToSnsAttributes(finalAttributes),
        MessageDeduplicationId: options?.deduplicationId,
        MessageGroupId: options?.groupId,
      });

      const response = await this.snsClient.send(command);

      const duration = Date.now() - startTime;
      this.logger.info('Message published successfully', {
        messageId: response.MessageId!,
        destination: topicArn,
        duration,
      });

      return {
        messageId: response.MessageId!,
        sequenceNumber: response.SequenceNumber,
        destination: topicArn,
        timestamp: new Date(),
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to publish message', {
        error:
          error instanceof Error
            ? {
                message: error.message,
                name: error.name,
                stack: error.stack,
              }
            : String(error),
        destination: topicArn || this.config?.destination || 'unknown',
        messageType: message?.constructor?.name || typeof message,
        duration,
      });

      if (error instanceof PublishError || error instanceof ConfigurationError) {
        throw error;
      }
      throw new PublishError(
        `Failed to publish message to SNS: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.resolvedTopicArn || this.config?.destination || 'unknown',
        error as Error
      );
    }
  }

  /**
   * Publish multiple messages in batch to the configured SNS topic.
   * Automatically chunks messages into batches of 10 (AWS SNS batch limit).
   *
   * @param messages - Array of messages to publish
   * @param options - Optional batch publish options
   * @returns Promise resolving to batch result with success/failure details
   * @throws ConfigurationError if publisher is not configured
   */
  async publishBatch(messages: T[], options?: BatchPublishOptions): Promise<BatchPublishResult> {
    this.ensureConfigured();

    const startTime = Date.now();
    const topicArn = await this.resolveTopicArn();

    this.logger.debug('Publishing batch', {
      batchSize: messages.length,
      destination: topicArn,
    });

    try {
      const successful: PublishResult[] = [];
      const failed: FailedPublish[] = [];
      const continueOnError = options?.continueOnError ?? true;

      // SNS doesn't have a native batch API, so we publish messages individually
      // but we can do them concurrently in chunks of 10 for better performance
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
              const duration = Date.now() - startTime;
              this.logger.info('Batch published', {
                successCount: successful.length,
                failureCount: failed.length,
                totalCount: messages.length,
                destination: topicArn,
                duration,
              });

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

      const duration = Date.now() - startTime;
      this.logger.info('Batch published', {
        successCount: successful.length,
        failureCount: failed.length,
        totalCount: messages.length,
        destination: topicArn,
        duration,
      });

      return {
        successful,
        failed,
        totalCount: messages.length,
        successCount: successful.length,
        failureCount: failed.length,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to publish batch', {
        error:
          error instanceof Error
            ? {
                message: error.message,
                name: error.name,
                stack: error.stack,
              }
            : String(error),
        destination: topicArn,
        batchSize: messages.length,
        duration,
      });

      throw error;
    }
  }

  /**
   * Resolve the topic ARN from the configured destination.
   * Supports both full ARNs and topic names.
   *
   * @returns Promise resolving to the full topic ARN
   * @private
   */
  private async resolveTopicArn(): Promise<string> {
    if (this.resolvedTopicArn) {
      return this.resolvedTopicArn;
    }

    const destination = this.config!.destination;

    // If it's already a full ARN, use it as-is
    if (destination.startsWith('arn:aws:sns:') || destination.startsWith('arn:aws-')) {
      this.resolvedTopicArn = destination;
      return destination;
    }

    // Otherwise, it's a topic name - use CreateTopic to get the ARN
    // CreateTopic is idempotent - it returns the existing topic ARN if it exists
    try {
      const command = new CreateTopicCommand({ Name: destination });
      const response = await this.snsClient.send(command);

      if (!response.TopicArn) {
        throw new ConfigurationError(
          `Failed to resolve topic name '${destination}' to ARN: No topic ARN returned`
        );
      }

      this.resolvedTopicArn = response.TopicArn;
      return this.resolvedTopicArn;
    } catch (error) {
      throw new ConfigurationError(
        `Failed to resolve topic name '${destination}' to ARN: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
   * Convert internal message attributes to SNS message attribute format.
   *
   * @param attributes - Internal message attributes
   * @returns SNS-compatible message attributes
   * @private
   */
  private convertToSnsAttributes(attributes: MessageAttributes): Record<string, any> {
    const snsAttributes: Record<string, any> = {};

    for (const [key, value] of Object.entries(attributes)) {
      snsAttributes[key] = {
        DataType: value.dataType,
        StringValue: value.dataType === 'String' ? String(value.value) : undefined,
        BinaryValue: value.dataType === 'Binary' ? value.value : undefined,
      };

      // For Number type, SNS expects it as a String with DataType 'Number'
      if (value.dataType === 'Number') {
        snsAttributes[key].StringValue = String(value.value);
      }
    }

    return snsAttributes;
  }

  /**
   * Apply configuration to the publisher.
   *
   * @param config - Configuration to apply
   * @private
   */
  private applyConfiguration(config: SnsPublisherConfig): void {
    this.config = config;

    // Create enrichment pipeline if enrichers are configured
    if (config.enrichers && config.enrichers.length > 0) {
      this.enrichmentPipeline = new EnrichmentPipeline(config.enrichers);
    }

    // Set logger from config (defaults to NoOpLogger if not configured)
    if (config.logger) {
      this.logger = config.logger;
    }

    // Reset resolved topic ARN when configuration changes
    this.resolvedTopicArn = undefined;
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
}
