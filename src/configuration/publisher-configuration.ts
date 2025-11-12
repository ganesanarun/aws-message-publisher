import { ContextResolver, MessageEnricher, MessageSerializer } from '../interfaces';
import { RetryPolicy } from '../types';
import { JsonMessageSerializer } from '../serializers';
import { ConfigurationError } from '../errors';

/**
 * Base configuration interface for publishers.
 */
export interface PublisherConfig {
  /**
   * Destination identifier (topic ARN/name or queue URL/name)
   */
  destination: string;

  /**
   * Message serializer (defaults to JSON if not specified)
   */
  serializer?: MessageSerializer;

  /**
   * Message enrichers to add metadata attributes
   */
  enrichers?: MessageEnricher[];

  /**
   * Context resolver to extract runtime context
   */
  contextResolver?: ContextResolver;

  /**
   * Retry policy for failed publish operations
   */
  retryPolicy?: RetryPolicy;
}

/**
 * Configuration specific to SNS publishers.
 */
export interface SnsPublisherConfig extends PublisherConfig {
  /**
   * SNS topic ARN or topic name
   * Examples:
   *   - Full ARN: 'arn:aws:sns:us-east-1:123456789:my-topic'
   *   - Topic name: 'my-topic' (will be resolved to full ARN)
   */
  destination: string;
}

/**
 * Configuration specific to SQS publishers.
 */
export interface SqsPublisherConfig extends PublisherConfig {
  /**
   * SQS queue URL or queue name
   * Examples:
   *   - Full URL: 'https://sqs.us-east-1.amazonaws.com/123456789/my-queue'
   *   - Queue name: 'my-queue' (will be resolved to full URL)
   */
  destination: string;
}

/**
 * Base class for fluent publisher configuration.
 * Provides method chaining for readable configuration.
 */
export abstract class PublisherConfiguration<T = any> {
  protected _destination?: string;
  protected _serializer?: MessageSerializer<T>;
  protected _enrichers: MessageEnricher[] = [];
  protected _contextResolver?: ContextResolver;
  protected _retryPolicy?: RetryPolicy;

  /**
   * Set the message serializer.
   *
   * @param serializer - The serializer to use for message serialization
   * @returns This configuration instance for method chaining
   */
  serializer(serializer: MessageSerializer<T>): this {
    this._serializer = serializer;
    return this;
  }

  /**
   * Set multiple enrichers at once.
   *
   * @param enrichers - Array of enrichers to apply
   * @returns This configuration instance for method chaining
   */
  enrichers(enrichers: MessageEnricher[]): this {
    this._enrichers = enrichers;
    return this;
  }

  /**
   * Add a single enricher to the enrichment pipeline.
   *
   * @param enricher - The enricher to add
   * @returns This configuration instance for method chaining
   */
  addEnricher(enricher: MessageEnricher): this {
    this._enrichers.push(enricher);
    return this;
  }

  /**
   * Set the context resolver.
   *
   * @param resolver - The context resolver to use
   * @returns This configuration instance for method chaining
   */
  contextResolver(resolver: ContextResolver): this {
    this._contextResolver = resolver;
    return this;
  }

  /**
   * Set the retry policy.
   *
   * @param policy - The retry policy configuration
   * @returns This configuration instance for method chaining
   */
  retryPolicy(policy: RetryPolicy): this {
    this._retryPolicy = policy;
    return this;
  }

  /**
   * Validate the configuration.
   * Throws ConfigurationError if required fields are missing.
   */
  protected abstract validate(): void;

  /**
   * Build the final configuration object.
   *
   * @returns The built configuration
   */
  abstract build(): PublisherConfig;
}

/**
 * Fluent configuration builder for SNS publishers.
 * Provides method chaining for readable SNS publisher configuration.
 */
export class SnsPublisherConfiguration<T = any> extends PublisherConfiguration<T> {
  /**
   * Set the SNS topic ARN or topic name.
   * If a full ARN is provided, it will be used as-is.
   * If a topic name is provided, it will be resolved to a full ARN at runtime.
   *
   * @param arnOrName - Full topic ARN or topic name
   * @returns This configuration instance for method chaining
   * @example
   * // Using full ARN
   * config.topicArn('arn:aws:sns:us-east-1:123456789:my-topic')
   *
   * // Using topic name (will be resolved to full ARN)
   * config.topicArn('my-topic')
   */
  topicArn(arnOrName: string): this {
    this._destination = arnOrName;
    return this;
  }

  /**
   * Alias for topicArn for better readability when using topic names.
   *
   * @param name - Topic name (will be resolved to full ARN)
   * @returns This configuration instance for method chaining
   * @example
   * config.topicName('my-topic')
   */
  topicName(name: string): this {
    this._destination = name;
    return this;
  }

  /**
   * Validate the SNS publisher configuration.
   * Ensures that required fields are present.
   *
   * @throws ConfigurationError if destination is not set
   */
  protected validate(): void {
    if (!this._destination) {
      throw new ConfigurationError('SNS publisher destination (topic ARN or name) is required');
    }
  }

  /**
   * Build the final SNS publisher configuration.
   * Applies default values and validates the configuration.
   *
   * @returns The built SNS publisher configuration
   * @throws ConfigurationError if validation fails
   */
  build(): SnsPublisherConfig {
    this.validate();

    // Apply default serializer if not specified
    if (!this._serializer) {
      this._serializer = new JsonMessageSerializer();
    }

    return {
      destination: this._destination!,
      serializer: this._serializer,
      enrichers: this._enrichers,
      contextResolver: this._contextResolver,
      retryPolicy: this._retryPolicy,
    };
  }
}

/**
 * Fluent configuration builder for SQS publishers.
 * Provides method chaining for readable SQS publisher configuration.
 */
export class SqsPublisherConfiguration<T = any> extends PublisherConfiguration<T> {
  /**
   * Set the SQS queue URL or queue name.
   * If a full URL is provided, it will be used as-is.
   * If a queue name is provided, it will be resolved to a full URL at runtime.
   *
   * @param urlOrName - Full queue URL or queue name
   * @returns This configuration instance for method chaining
   * @example
   * // Using full URL
   * config.queueUrl('https://sqs.us-east-1.amazonaws.com/123456789/my-queue')
   *
   * // Using queue name (will be resolved to full URL)
   * config.queueUrl('my-queue')
   */
  queueUrl(urlOrName: string): this {
    this._destination = urlOrName;
    return this;
  }

  /**
   * Alias for queueUrl for better readability when using queue names.
   *
   * @param name - Queue name (will be resolved to full URL)
   * @returns This configuration instance for method chaining
   * @example
   * config.queueName('my-queue')
   */
  queueName(name: string): this {
    this._destination = name;
    return this;
  }

  /**
   * Validate the SQS publisher configuration.
   * Ensures that required fields are present.
   *
   * @throws ConfigurationError if destination is not set
   */
  protected validate(): void {
    if (!this._destination) {
      throw new ConfigurationError('SQS publisher destination (queue URL or name) is required');
    }
  }

  /**
   * Build the final SQS publisher configuration.
   * Applies default values and validates the configuration.
   *
   * @returns The built SQS publisher configuration
   * @throws ConfigurationError if validation fails
   */
  build(): SqsPublisherConfig {
    this.validate();

    // Apply default serializer if not specified
    if (!this._serializer) {
      this._serializer = new JsonMessageSerializer();
    }

    return {
      destination: this._destination!,
      serializer: this._serializer,
      enrichers: this._enrichers,
      contextResolver: this._contextResolver,
      retryPolicy: this._retryPolicy,
    };
  }
}
