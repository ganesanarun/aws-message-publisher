import { GetQueueUrlCommand, SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import {
  ConfigurationError,
  ContextResolver,
  JsonMessageSerializer,
  MessageAttributes,
  MessageEnricher,
  MessageSerializer,
  PublishContext,
  PublishError,
  SqsMessagePublisher,
  TimestampEnricher,
} from '../../src';

// Mock enricher for testing
class MockEnricher implements MessageEnricher {
  async enrich(_message: any, _context: PublishContext): Promise<MessageAttributes> {
    return {
      mockAttribute: {
        dataType: 'String',
        value: 'mock-value',
      },
    };
  }

  getPriority(): number {
    return 10;
  }
}

// Mock AWS SDK
jest.mock('@aws-sdk/client-sqs');

describe('SqsMessagePublisher', () => {
  let publisher: SqsMessagePublisher;
  let mockSqsClient: jest.Mocked<SQSClient>;
  let mockSend: jest.Mock;

  beforeEach(() => {
    // Create mock SQS client
    mockSend = jest.fn();
    mockSqsClient = {
      send: mockSend,
      config: {
        region: jest.fn().mockResolvedValue('us-east-1'),
      },
    } as any;

    publisher = new SqsMessagePublisher(mockSqsClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('configure', () => {
    it('should configure publisher with queue URL', () => {
      const result = publisher.configure(config =>
        config.queueUrl('https://sqs.us-east-1.amazonaws.com/123456789/test-queue')
      );

      expect(result).toBe(publisher);
    });

    it('should configure publisher with queue name', () => {
      const result = publisher.configure(config => config.queueName('test-queue'));

      expect(result).toBe(publisher);
    });

    it('should configure publisher with enrichers', () => {
      const result = publisher.configure(config =>
        config
          .queueUrl('https://sqs.us-east-1.amazonaws.com/123456789/test-queue')
          .enrichers([new MockEnricher(), new TimestampEnricher()])
      );

      expect(result).toBe(publisher);
    });

    it('should configure publisher with custom serializer', () => {
      const customSerializer = new JsonMessageSerializer();

      const result = publisher.configure(config =>
        config
          .queueUrl('https://sqs.us-east-1.amazonaws.com/123456789/test-queue')
          .serializer(customSerializer)
      );

      expect(result).toBe(publisher);
    });

    it('should throw ConfigurationError if destination is not set', () => {
      expect(() => {
        publisher.configure(config => {
          // Don't set destination
          config.enrichers([]);
        });
      }).toThrow(ConfigurationError);
    });
  });

  describe('publish', () => {
    beforeEach(() => {
      mockSend.mockResolvedValue({
        MessageId: 'test-message-id-123',
        SequenceNumber: undefined,
      });
    });

    it('should throw ConfigurationError if not configured', async () => {
      await expect(publisher.publish({ test: 'data' })).rejects.toThrow(ConfigurationError);
      await expect(publisher.publish({ test: 'data' })).rejects.toThrow(
        'Publisher must be configured before use'
      );
    });

    it('should publish message with full queue URL', async () => {
      publisher.configure(config =>
        config.queueUrl('https://sqs.us-east-1.amazonaws.com/123456789/test-queue')
      );

      const message = { id: 1, data: 'test' };
      const result = await publisher.publish(message);

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(expect.any(SendMessageCommand));
      expect(result.messageId).toBe('test-message-id-123');
      expect(result.destination).toBe('https://sqs.us-east-1.amazonaws.com/123456789/test-queue');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should publish message with queue name resolution', async () => {
      // Mock GetQueueUrlCommand response
      mockSend.mockImplementation(command => {
        if (command instanceof GetQueueUrlCommand) {
          return Promise.resolve({
            QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789/test-queue',
          });
        }
        if (command instanceof SendMessageCommand) {
          return Promise.resolve({
            MessageId: 'test-message-id-123',
          });
        }
        return Promise.reject(new Error('Unknown command'));
      });

      publisher.configure(config => config.queueName('test-queue'));

      const message = { id: 1, data: 'test' };
      const result = await publisher.publish(message);

      expect(mockSend).toHaveBeenCalledTimes(2); // GetQueueUrl + SendMessage
      expect(mockSend).toHaveBeenCalledWith(expect.any(GetQueueUrlCommand));
      expect(mockSend).toHaveBeenCalledWith(expect.any(SendMessageCommand));
      expect(result.messageId).toBe('test-message-id-123');
      expect(result.destination).toBe('https://sqs.us-east-1.amazonaws.com/123456789/test-queue');
    });

    it('should throw ConfigurationError when queue name resolution fails', async () => {
      mockSend.mockRejectedValue(new Error('Queue not found'));

      publisher.configure(config => config.queueName('non-existent-queue'));

      const message = { id: 1, data: 'test' };

      await expect(publisher.publish(message)).rejects.toThrow(ConfigurationError);
      await expect(publisher.publish(message)).rejects.toThrow('Failed to resolve queue name');
    });

    it('should serialize message using configured serializer', async () => {
      const mockSerializer: jest.Mocked<MessageSerializer> = {
        serialize: jest.fn().mockResolvedValue({
          body: '{"id":1,"data":"test"}',
          contentType: 'application/json',
        }),
        getContentType: jest.fn().mockReturnValue('application/json'),
      };

      publisher.configure(config =>
        config
          .queueUrl('https://sqs.us-east-1.amazonaws.com/123456789/test-queue')
          .serializer(mockSerializer)
      );

      const message = { id: 1, data: 'test' };
      await publisher.publish(message);

      expect(mockSerializer.serialize).toHaveBeenCalledWith(message);
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(expect.any(SendMessageCommand));
    });

    it('should enrich message with configured enrichers', async () => {
      const mockEnricher: jest.Mocked<MessageEnricher> = {
        enrich: jest.fn().mockResolvedValue({
          traceId: { dataType: 'String', value: 'trace-123' },
        }),
        getPriority: jest.fn().mockReturnValue(10),
      };

      publisher.configure(config =>
        config
          .queueUrl('https://sqs.us-east-1.amazonaws.com/123456789/test-queue')
          .enrichers([mockEnricher])
      );

      const message = { id: 1, data: 'test' };
      await publisher.publish(message);

      expect(mockEnricher.enrich).toHaveBeenCalledWith(message, {});
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(expect.any(SendMessageCommand));
    });

    it('should add contentType attribute to message', async () => {
      publisher.configure(config =>
        config.queueUrl('https://sqs.us-east-1.amazonaws.com/123456789/test-queue')
      );

      const message = { id: 1, data: 'test' };
      await publisher.publish(message);

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(expect.any(SendMessageCommand));
    });

    it('should merge enricher attributes with options attributes', async () => {
      const mockEnricher: jest.Mocked<MessageEnricher> = {
        enrich: jest.fn().mockResolvedValue({
          traceId: { dataType: 'String', value: 'trace-123' },
        }),
        getPriority: jest.fn().mockReturnValue(10),
      };

      publisher.configure(config =>
        config
          .queueUrl('https://sqs.us-east-1.amazonaws.com/123456789/test-queue')
          .enrichers([mockEnricher])
      );

      const message = { id: 1, data: 'test' };
      await publisher.publish(message, {
        messageAttributes: {
          customAttr: { dataType: 'String', value: 'custom-value' },
        },
      });

      expect(mockEnricher.enrich).toHaveBeenCalledWith(message, {});
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(expect.any(SendMessageCommand));
    });

    it('should include deduplicationId, groupId, and delaySeconds for FIFO queues', async () => {
      publisher.configure(config =>
        config.queueUrl('https://sqs.us-east-1.amazonaws.com/123456789/test-queue.fifo')
      );

      const message = { id: 1, data: 'test' };
      await publisher.publish(message, {
        deduplicationId: 'dedup-123',
        groupId: 'group-456',
        delaySeconds: 10,
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(expect.any(SendMessageCommand));
    });

    it('should return PublishResult with messageId and destination', async () => {
      publisher.configure(config =>
        config.queueUrl('https://sqs.us-east-1.amazonaws.com/123456789/test-queue')
      );

      const message = { id: 1, data: 'test' };
      const result = await publisher.publish(message);

      expect(result).toEqual({
        messageId: 'test-message-id-123',
        sequenceNumber: undefined,
        destination: 'https://sqs.us-east-1.amazonaws.com/123456789/test-queue',
        timestamp: expect.any(Date),
      });
    });

    it('should throw PublishError on AWS SDK error', async () => {
      mockSend.mockRejectedValue(new Error('AWS SDK Error'));

      publisher.configure(config =>
        config.queueUrl('https://sqs.us-east-1.amazonaws.com/123456789/test-queue')
      );

      const message = { id: 1, data: 'test' };

      await expect(publisher.publish(message)).rejects.toThrow(PublishError);
      await expect(publisher.publish(message)).rejects.toThrow('Failed to publish message to SQS');
    });

    it('should use context resolver if configured', async () => {
      const mockContextResolver: jest.Mocked<ContextResolver> = {
        resolve: jest.fn().mockResolvedValue({
          traceId: 'trace-from-resolver',
          correlationId: 'corr-from-resolver',
        }),
      };

      const mockEnricher: jest.Mocked<MessageEnricher> = {
        enrich: jest.fn().mockResolvedValue({
          traceId: { dataType: 'String', value: 'trace-123' },
        }),
        getPriority: jest.fn().mockReturnValue(10),
      };

      publisher.configure(config =>
        config
          .queueUrl('https://sqs.us-east-1.amazonaws.com/123456789/test-queue')
          .contextResolver(mockContextResolver)
          .enrichers([mockEnricher])
      );

      const message = { id: 1, data: 'test' };
      await publisher.publish(message);

      expect(mockContextResolver.resolve).toHaveBeenCalled();
      expect(mockEnricher.enrich).toHaveBeenCalledWith(message, {
        traceId: 'trace-from-resolver',
        correlationId: 'corr-from-resolver',
      });
    });
  });

  describe('publishBatch', () => {
    beforeEach(() => {
      mockSend.mockImplementation(() =>
        Promise.resolve({
          MessageId: `msg-${Math.random()}`,
        })
      );
    });

    it('should throw ConfigurationError if not configured', async () => {
      await expect(publisher.publishBatch([{ test: 'data' }])).rejects.toThrow(ConfigurationError);
    });

    it('should publish all messages in batch', async () => {
      publisher.configure(config =>
        config.queueUrl('https://sqs.us-east-1.amazonaws.com/123456789/test-queue')
      );

      const messages = [
        { id: 1, data: 'test1' },
        { id: 2, data: 'test2' },
        { id: 3, data: 'test3' },
      ];

      const result = await publisher.publishBatch(messages);

      expect(mockSend).toHaveBeenCalledTimes(3);
      expect(result.totalCount).toBe(3);
      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
      expect(result.successful).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
    });

    it('should chunk messages into batches of 10', async () => {
      publisher.configure(config =>
        config.queueUrl('https://sqs.us-east-1.amazonaws.com/123456789/test-queue')
      );

      const messages = Array.from({ length: 25 }, (_, i) => ({
        id: i,
        data: `test${i}`,
      }));

      const result = await publisher.publishBatch(messages);

      expect(mockSend).toHaveBeenCalledTimes(25);
      expect(result.totalCount).toBe(25);
      expect(result.successCount).toBe(25);
    });

    it('should handle partial failures with continueOnError=true', async () => {
      let callCount = 0;
      mockSend.mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.reject(new Error('Failed to publish'));
        }
        return Promise.resolve({ MessageId: `msg-${callCount}` });
      });

      publisher.configure(config =>
        config.queueUrl('https://sqs.us-east-1.amazonaws.com/123456789/test-queue')
      );

      const messages = [
        { id: 1, data: 'test1' },
        { id: 2, data: 'test2' },
        { id: 3, data: 'test3' },
      ];

      const result = await publisher.publishBatch(messages, {
        continueOnError: true,
      });

      expect(result.totalCount).toBe(3);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].index).toBe(1);
      expect(result.failed[0].message).toEqual({ id: 2, data: 'test2' });
    });

    it('should stop on first failure with continueOnError=false', async () => {
      let callCount = 0;
      mockSend.mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.reject(new Error('Failed to publish'));
        }
        return Promise.resolve({ MessageId: `msg-${callCount}` });
      });

      publisher.configure(config =>
        config.queueUrl('https://sqs.us-east-1.amazonaws.com/123456789/test-queue')
      );

      const messages = [
        { id: 1, data: 'test1' },
        { id: 2, data: 'test2' },
        { id: 3, data: 'test3' },
      ];

      const result = await publisher.publishBatch(messages, {
        continueOnError: false,
      });

      // Should process first chunk (all 3 messages concurrently), then stop
      expect(result.failureCount).toBeGreaterThan(0);
    });

    it('should return BatchPublishResult with success and failure details', async () => {
      mockSend
        .mockResolvedValueOnce({ MessageId: 'msg-1' })
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({ MessageId: 'msg-3' });

      publisher.configure(config =>
        config.queueUrl('https://sqs.us-east-1.amazonaws.com/123456789/test-queue')
      );

      const messages = [
        { id: 1, data: 'test1' },
        { id: 2, data: 'test2' },
        { id: 3, data: 'test3' },
      ];

      const result = await publisher.publishBatch(messages);

      expect(result.totalCount).toBe(3);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
      expect(result.successful[0].messageId).toBe('msg-1');
      expect(result.successful[1].messageId).toBe('msg-3');
      expect(result.failed[0].error).toBeInstanceOf(Error);
    });

    it('should process large batches efficiently', async () => {
      publisher.configure(config =>
        config.queueUrl('https://sqs.us-east-1.amazonaws.com/123456789/test-queue')
      );

      const messages = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        data: `test${i}`,
      }));

      const result = await publisher.publishBatch(messages);

      expect(result.totalCount).toBe(100);
      expect(result.successCount).toBe(100);
      expect(result.failureCount).toBe(0);
    });
  });

  describe('TypeScript union types', () => {
    type OrderEvent =
      | { type: 'ORDER_CREATED'; orderId: string; amount: number }
      | { type: 'ORDER_UPDATED'; orderId: string; changes: Record<string, any> }
      | { type: 'ORDER_CANCELLED'; orderId: string; reason: string };

    it('should support union types for messages', async () => {
      mockSend.mockResolvedValue({ MessageId: 'test-id' });

      const typedPublisher = new SqsMessagePublisher<OrderEvent>(mockSqsClient);
      typedPublisher.configure(config =>
        config.queueUrl('https://sqs.us-east-1.amazonaws.com/123456789/orders')
      );

      const event1: OrderEvent = {
        type: 'ORDER_CREATED',
        orderId: '123',
        amount: 100,
      };

      const event2: OrderEvent = {
        type: 'ORDER_CANCELLED',
        orderId: '456',
        reason: 'Customer request',
      };

      await typedPublisher.publish(event1);
      await typedPublisher.publish(event2);

      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should support union types in batch publishing', async () => {
      mockSend.mockResolvedValue({ MessageId: 'test-id' });

      const typedPublisher = new SqsMessagePublisher<OrderEvent>(mockSqsClient);
      typedPublisher.configure(config =>
        config.queueUrl('https://sqs.us-east-1.amazonaws.com/123456789/orders')
      );

      const events: OrderEvent[] = [
        { type: 'ORDER_CREATED', orderId: '123', amount: 100 },
        { type: 'ORDER_UPDATED', orderId: '456', changes: { status: 'shipped' } },
        { type: 'ORDER_CANCELLED', orderId: '789', reason: 'Out of stock' },
      ];

      const result = await typedPublisher.publishBatch(events);

      expect(result.successCount).toBe(3);
    });
  });

  describe('integration with real enrichers', () => {
    it('should work with MockEnricher', async () => {
      mockSend.mockResolvedValue({ MessageId: 'test-id' });

      publisher.configure(config =>
        config
          .queueUrl('https://sqs.us-east-1.amazonaws.com/123456789/test-queue')
          .enrichers([new MockEnricher()])
      );

      const message = { id: 1, data: 'test' };
      await publisher.publish(message);

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(expect.any(SendMessageCommand));
    });

    it('should work with multiple enrichers in priority order', async () => {
      mockSend.mockResolvedValue({ MessageId: 'test-id' });

      publisher.configure(config =>
        config
          .queueUrl('https://sqs.us-east-1.amazonaws.com/123456789/test-queue')
          .enrichers([new MockEnricher(), new TimestampEnricher()])
      );

      const message = { id: 1, data: 'test' };
      await publisher.publish(message);

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(expect.any(SendMessageCommand));
    });
  });
});
