import {
  ConfigurationError,
  JsonMessageSerializer,
  MessageEnricher,
  MessageAttributes,
  PublishContext,
  SnsPublisherConfiguration,
  SqsPublisherConfiguration,
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

describe('SnsPublisherConfiguration', () => {
  describe('topicArn', () => {
    it('should set destination using topicArn method', () => {
      const config = new SnsPublisherConfiguration();
      config.topicArn('arn:aws:sns:us-east-1:123456789:my-topic');

      const built = config.build();

      expect(built.destination).toBe('arn:aws:sns:us-east-1:123456789:my-topic');
    });

    it('should support method chaining', () => {
      const config = new SnsPublisherConfiguration();

      const result = config.topicArn('my-topic');

      expect(result).toBe(config);
    });
  });

  describe('topicName', () => {
    it('should set destination using topicName method', () => {
      const config = new SnsPublisherConfiguration();
      config.topicName('my-topic');

      const built = config.build();

      expect(built.destination).toBe('my-topic');
    });

    it('should support method chaining', () => {
      const config = new SnsPublisherConfiguration();

      const result = config.topicName('my-topic');

      expect(result).toBe(config);
    });
  });

  describe('serializer', () => {
    it('should set custom serializer', () => {
      const customSerializer = new JsonMessageSerializer();
      const config = new SnsPublisherConfiguration();
      config.topicArn('my-topic').serializer(customSerializer);

      const built = config.build();

      expect(built.serializer).toBe(customSerializer);
    });

    it('should use default JsonMessageSerializer when not specified', () => {
      const config = new SnsPublisherConfiguration();
      config.topicArn('my-topic');

      const built = config.build();

      expect(built.serializer).toBeInstanceOf(JsonMessageSerializer);
    });

    it('should support method chaining', () => {
      const config = new SnsPublisherConfiguration();

      const result = config.serializer(new JsonMessageSerializer());

      expect(result).toBe(config);
    });
  });

  describe('enrichers', () => {
    it('should set multiple enrichers at once', () => {
      const enrichers = [new MockEnricher(), new MockEnricher()];
      const config = new SnsPublisherConfiguration();
      config.topicArn('my-topic').enrichers(enrichers);

      const built = config.build();

      expect(built.enrichers).toEqual(enrichers);
    });

    it('should support method chaining', () => {
      const config = new SnsPublisherConfiguration();

      const result = config.enrichers([new MockEnricher()]);

      expect(result).toBe(config);
    });
  });

  describe('addEnricher', () => {
    it('should add a single enricher', () => {
      const enricher = new MockEnricher();
      const config = new SnsPublisherConfiguration();
      config.topicArn('my-topic').addEnricher(enricher);

      const built = config.build();

      expect(built.enrichers).toContain(enricher);
    });

    it('should add multiple enrichers sequentially', () => {
      const enricher1 = new MockEnricher();
      const enricher2 = new MockEnricher();
      const config = new SnsPublisherConfiguration();
      config.topicArn('my-topic').addEnricher(enricher1).addEnricher(enricher2);

      const built = config.build();

      expect(built.enrichers).toEqual([enricher1, enricher2]);
    });

    it('should support method chaining', () => {
      const config = new SnsPublisherConfiguration();

      const result = config.addEnricher(new MockEnricher());

      expect(result).toBe(config);
    });
  });

  describe('validate', () => {
    it('should throw ConfigurationError when destination is not set', () => {
      const config = new SnsPublisherConfiguration();

      expect(() => config.build()).toThrow(ConfigurationError);
      expect(() => config.build()).toThrow(
        'SNS publisher destination (topic ARN or name) is required'
      );
    });

    it('should not throw when destination is set', () => {
      const config = new SnsPublisherConfiguration();
      config.topicArn('my-topic');

      expect(() => config.build()).not.toThrow();
    });
  });

  describe('build', () => {
    it('should build complete configuration with all options', () => {
      const serializer = new JsonMessageSerializer();
      const enrichers = [new MockEnricher()];
      const config = new SnsPublisherConfiguration();
      config.topicArn('my-topic').serializer(serializer).enrichers(enrichers);

      const built = config.build();

      expect(built.destination).toBe('my-topic');
      expect(built.serializer).toBe(serializer);
      expect(built.enrichers).toEqual(enrichers);
    });

    it('should build minimal configuration with defaults', () => {
      const config = new SnsPublisherConfiguration();
      config.topicArn('my-topic');

      const built = config.build();

      expect(built.destination).toBe('my-topic');
      expect(built.serializer).toBeInstanceOf(JsonMessageSerializer);
      expect(built.enrichers).toEqual([]);
    });
  });
});

describe('SqsPublisherConfiguration', () => {
  describe('queueUrl', () => {
    it('should set destination using queueUrl method', () => {
      const config = new SqsPublisherConfiguration();
      config.queueUrl('https://sqs.us-east-1.amazonaws.com/123456789/my-queue');

      const built = config.build();

      expect(built.destination).toBe('https://sqs.us-east-1.amazonaws.com/123456789/my-queue');
    });

    it('should support method chaining', () => {
      const config = new SqsPublisherConfiguration();

      const result = config.queueUrl('my-queue');

      expect(result).toBe(config);
    });
  });

  describe('queueName', () => {
    it('should set destination using queueName method', () => {
      const config = new SqsPublisherConfiguration();
      config.queueName('my-queue');

      const built = config.build();

      expect(built.destination).toBe('my-queue');
    });

    it('should support method chaining', () => {
      const config = new SqsPublisherConfiguration();

      const result = config.queueName('my-queue');

      expect(result).toBe(config);
    });
  });

  describe('serializer', () => {
    it('should set custom serializer', () => {
      const customSerializer = new JsonMessageSerializer();
      const config = new SqsPublisherConfiguration();
      config.queueUrl('my-queue').serializer(customSerializer);

      const built = config.build();

      expect(built.serializer).toBe(customSerializer);
    });

    it('should use default JsonMessageSerializer when not specified', () => {
      const config = new SqsPublisherConfiguration();
      config.queueUrl('my-queue');

      const built = config.build();

      expect(built.serializer).toBeInstanceOf(JsonMessageSerializer);
    });

    it('should support method chaining', () => {
      const config = new SqsPublisherConfiguration();

      const result = config.serializer(new JsonMessageSerializer());

      expect(result).toBe(config);
    });
  });

  describe('enrichers', () => {
    it('should set multiple enrichers at once', () => {
      const enrichers = [new MockEnricher(), new MockEnricher()];
      const config = new SqsPublisherConfiguration();
      config.queueUrl('my-queue').enrichers(enrichers);

      const built = config.build();

      expect(built.enrichers).toEqual(enrichers);
    });

    it('should support method chaining', () => {
      const config = new SqsPublisherConfiguration();

      const result = config.enrichers([new MockEnricher()]);

      expect(result).toBe(config);
    });
  });

  describe('addEnricher', () => {
    it('should add a single enricher', () => {
      const enricher = new MockEnricher();
      const config = new SqsPublisherConfiguration();
      config.queueUrl('my-queue').addEnricher(enricher);

      const built = config.build();

      expect(built.enrichers).toContain(enricher);
    });

    it('should add multiple enrichers sequentially', () => {
      const enricher1 = new MockEnricher();
      const enricher2 = new MockEnricher();
      const config = new SqsPublisherConfiguration();
      config.queueUrl('my-queue').addEnricher(enricher1).addEnricher(enricher2);

      const built = config.build();

      expect(built.enrichers).toEqual([enricher1, enricher2]);
    });

    it('should support method chaining', () => {
      const config = new SqsPublisherConfiguration();

      const result = config.addEnricher(new MockEnricher());

      expect(result).toBe(config);
    });
  });

  describe('validate', () => {
    it('should throw ConfigurationError when destination is not set', () => {
      const config = new SqsPublisherConfiguration();

      expect(() => config.build()).toThrow(ConfigurationError);
      expect(() => config.build()).toThrow(
        'SQS publisher destination (queue URL or name) is required'
      );
    });

    it('should not throw when destination is set', () => {
      const config = new SqsPublisherConfiguration();
      config.queueUrl('my-queue');

      expect(() => config.build()).not.toThrow();
    });
  });

  describe('build', () => {
    it('should build complete configuration with all options', () => {
      const serializer = new JsonMessageSerializer();
      const enrichers = [new MockEnricher()];
      const config = new SqsPublisherConfiguration();
      config.queueUrl('my-queue').serializer(serializer).enrichers(enrichers);

      const built = config.build();

      expect(built.destination).toBe('my-queue');
      expect(built.serializer).toBe(serializer);
      expect(built.enrichers).toEqual(enrichers);
    });

    it('should build minimal configuration with defaults', () => {
      const config = new SqsPublisherConfiguration();
      config.queueUrl('my-queue');

      const built = config.build();

      expect(built.destination).toBe('my-queue');
      expect(built.serializer).toBeInstanceOf(JsonMessageSerializer);
      expect(built.enrichers).toEqual([]);
    });
  });
});
