import { EnrichmentPipeline, MessageAttributes, MessageEnricher, PublishContext } from '../../src';

describe('EnrichmentPipeline', () => {
  describe('constructor and enricher ordering', () => {
    it('should sort enrichers by priority in ascending order', () => {
      const enricher1: MessageEnricher = {
        enrich: jest.fn(),
        getPriority: () => 30,
      };
      const enricher2: MessageEnricher = {
        enrich: jest.fn(),
        getPriority: () => 10,
      };
      const enricher3: MessageEnricher = {
        enrich: jest.fn(),
        getPriority: () => 20,
      };

      const pipeline = new EnrichmentPipeline([enricher1, enricher2, enricher3]);

      const sortedEnrichers = pipeline.getEnrichers();

      expect(sortedEnrichers[0]).toBe(enricher2);
      expect(sortedEnrichers[1]).toBe(enricher3);
      expect(sortedEnrichers[2]).toBe(enricher1);
    });

    it('should use default priority of 100 for enrichers without getPriority', () => {
      const enricher1: MessageEnricher = {
        enrich: jest.fn(),
        getPriority: () => 50,
      };
      const enricher2: MessageEnricher = {
        enrich: jest.fn(),
      };
      const enricher3: MessageEnricher = {
        enrich: jest.fn(),
        getPriority: () => 150,
      };

      const pipeline = new EnrichmentPipeline([enricher1, enricher2, enricher3]);

      const sortedEnrichers = pipeline.getEnrichers();

      expect(sortedEnrichers[0]).toBe(enricher1);
      expect(sortedEnrichers[1]).toBe(enricher2);
      expect(sortedEnrichers[2]).toBe(enricher3);
    });

    it('should maintain stable order for enrichers with same priority', () => {
      const enricher1: MessageEnricher = {
        enrich: jest.fn(),
        getPriority: () => 10,
      };
      const enricher2: MessageEnricher = {
        enrich: jest.fn(),
        getPriority: () => 10,
      };

      const pipeline = new EnrichmentPipeline([enricher1, enricher2]);

      const sortedEnrichers = pipeline.getEnrichers();

      expect(sortedEnrichers[0]).toBe(enricher1);
      expect(sortedEnrichers[1]).toBe(enricher2);
    });
  });

  describe('enrich', () => {
    it('should execute enrichers in priority order', async () => {
      const executionOrder: number[] = [];
      const enricher1: MessageEnricher = {
        enrich: jest.fn(async () => {
          executionOrder.push(1);
          return {};
        }),
        getPriority: () => 30,
      };
      const enricher2: MessageEnricher = {
        enrich: jest.fn(async () => {
          executionOrder.push(2);
          return {};
        }),
        getPriority: () => 10,
      };
      const enricher3: MessageEnricher = {
        enrich: jest.fn(async () => {
          executionOrder.push(3);
          return {};
        }),
        getPriority: () => 20,
      };
      const pipeline = new EnrichmentPipeline([enricher1, enricher2, enricher3]);
      const message = { id: 1, data: 'test' };
      const context: PublishContext = {};

      await pipeline.enrich(message, context);

      expect(executionOrder).toEqual([2, 3, 1]);
    });

    it('should merge attributes from multiple enrichers', async () => {
      const enricher1: MessageEnricher = {
        enrich: jest.fn(
          async (): Promise<MessageAttributes> => ({
            traceId: { dataType: 'String', value: 'trace-123' },
          })
        ),
        getPriority: () => 10,
      };
      const enricher2: MessageEnricher = {
        enrich: jest.fn(
          async (): Promise<MessageAttributes> => ({
            correlationId: { dataType: 'String', value: 'corr-456' },
          })
        ),
        getPriority: () => 20,
      };
      const enricher3: MessageEnricher = {
        enrich: jest.fn(
          async (): Promise<MessageAttributes> => ({
            timestamp: { dataType: 'String', value: '2024-01-01T00:00:00Z' },
          })
        ),
        getPriority: () => 30,
      };
      const pipeline = new EnrichmentPipeline([enricher1, enricher2, enricher3]);
      const message = { id: 1, data: 'test' };
      const context: PublishContext = {};

      const result = await pipeline.enrich(message, context);

      expect(result).toEqual({
        traceId: { dataType: 'String', value: 'trace-123' },
        correlationId: { dataType: 'String', value: 'corr-456' },
        timestamp: { dataType: 'String', value: '2024-01-01T00:00:00Z' },
      });
    });

    it('should resolve conflicts with last enricher winning', async () => {
      const enricher1: MessageEnricher = {
        enrich: jest.fn(
          async (): Promise<MessageAttributes> => ({
            environment: { dataType: 'String', value: 'development' },
            traceId: { dataType: 'String', value: 'trace-123' },
          })
        ),
        getPriority: () => 10,
      };
      const enricher2: MessageEnricher = {
        enrich: jest.fn(
          async (): Promise<MessageAttributes> => ({
            environment: { dataType: 'String', value: 'production' },
            correlationId: { dataType: 'String', value: 'corr-456' },
          })
        ),
        getPriority: () => 20,
      };
      const pipeline = new EnrichmentPipeline([enricher1, enricher2]);
      const message = { id: 1, data: 'test' };
      const context: PublishContext = {};

      const result = await pipeline.enrich(message, context);

      expect(result.environment).toEqual({ dataType: 'String', value: 'production' });
      expect(result.traceId).toEqual({ dataType: 'String', value: 'trace-123' });
      expect(result.correlationId).toEqual({ dataType: 'String', value: 'corr-456' });
    });

    it('should pass message and context to all enrichers', async () => {
      const enricher1: MessageEnricher = {
        enrich: jest.fn(async () => ({})),
        getPriority: () => 10,
      };
      const enricher2: MessageEnricher = {
        enrich: jest.fn(async () => ({})),
        getPriority: () => 20,
      };
      const pipeline = new EnrichmentPipeline([enricher1, enricher2]);
      const message = { id: 1, data: 'test' };
      const context: PublishContext = {
        traceId: 'trace-123',
        correlationId: 'corr-456',
      };

      await pipeline.enrich(message, context);

      expect(enricher1.enrich).toHaveBeenCalledWith(message, context);
      expect(enricher2.enrich).toHaveBeenCalledWith(message, context);
    });
  });

  describe('error handling', () => {
    it('should continue execution when an enricher fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const enricher1: MessageEnricher = {
        enrich: jest.fn(
          async (): Promise<MessageAttributes> => ({
            traceId: { dataType: 'String', value: 'trace-123' },
          })
        ),
        getPriority: () => 10,
      };
      const enricher2: MessageEnricher = {
        enrich: jest.fn(async () => {
          throw new Error('Enricher failed');
        }),
        getPriority: () => 20,
      };
      const enricher3: MessageEnricher = {
        enrich: jest.fn(
          async (): Promise<MessageAttributes> => ({
            timestamp: { dataType: 'String', value: '2024-01-01T00:00:00Z' },
          })
        ),
        getPriority: () => 30,
      };
      const pipeline = new EnrichmentPipeline([enricher1, enricher2, enricher3]);
      const message = { id: 1, data: 'test' };
      const context: PublishContext = {};

      const result = await pipeline.enrich(message, context);

      expect(result).toEqual({
        traceId: { dataType: 'String', value: 'trace-123' },
        timestamp: { dataType: 'String', value: '2024-01-01T00:00:00Z' },
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Enricher'),
        'Enricher failed'
      );
      consoleErrorSpy.mockRestore();
    });

    it('should log error with enricher name when enricher fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      class CustomEnricher implements MessageEnricher {
        async enrich(): Promise<MessageAttributes> {
          throw new Error('Custom error');
        }
        getPriority(): number {
          return 10;
        }
      }
      const enricher = new CustomEnricher();
      const pipeline = new EnrichmentPipeline([enricher]);
      const message = { id: 1, data: 'test' };
      const context: PublishContext = {};

      await pipeline.enrich(message, context);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Enricher CustomEnricher failed:',
        'Custom error'
      );
      consoleErrorSpy.mockRestore();
    });

    it('should handle non-Error exceptions gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const enricher: MessageEnricher = {
        enrich: jest.fn(async () => {
          throw 'String error';
        }),
        getPriority: () => 10,
      };
      const pipeline = new EnrichmentPipeline([enricher]);
      const message = { id: 1, data: 'test' };
      const context: PublishContext = {};

      const result = await pipeline.enrich(message, context);

      expect(result).toEqual({});
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should return empty attributes when all enrichers fail', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const enricher1: MessageEnricher = {
        enrich: jest.fn(async () => {
          throw new Error('Error 1');
        }),
        getPriority: () => 10,
      };
      const enricher2: MessageEnricher = {
        enrich: jest.fn(async () => {
          throw new Error('Error 2');
        }),
        getPriority: () => 20,
      };
      const pipeline = new EnrichmentPipeline([enricher1, enricher2]);
      const message = { id: 1, data: 'test' };
      const context: PublishContext = {};

      const result = await pipeline.enrich(message, context);

      expect(result).toEqual({});
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
      consoleErrorSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('should handle empty enricher array', async () => {
      const pipeline = new EnrichmentPipeline([]);
      const message = { id: 1, data: 'test' };
      const context: PublishContext = {};

      const result = await pipeline.enrich(message, context);

      expect(result).toEqual({});
    });

    it('should handle enrichers returning empty attributes', async () => {
      const enricher1: MessageEnricher = {
        enrich: jest.fn(async () => ({})),
        getPriority: () => 10,
      };
      const enricher2: MessageEnricher = {
        enrich: jest.fn(async () => ({})),
        getPriority: () => 20,
      };
      const pipeline = new EnrichmentPipeline([enricher1, enricher2]);
      const message = { id: 1, data: 'test' };
      const context: PublishContext = {};

      const result = await pipeline.enrich(message, context);

      expect(result).toEqual({});
    });

    it('should not mutate original enricher array', () => {
      const enricher1: MessageEnricher = {
        enrich: jest.fn(),
        getPriority: () => 30,
      };
      const enricher2: MessageEnricher = {
        enrich: jest.fn(),
        getPriority: () => 10,
      };
      const originalArray = [enricher1, enricher2];

      const pipeline = new EnrichmentPipeline(originalArray);

      expect(originalArray[0]).toBe(enricher1);
      expect(originalArray[1]).toBe(enricher2);
      const sortedEnrichers = pipeline.getEnrichers();
      expect(sortedEnrichers[0]).toBe(enricher2);
      expect(sortedEnrichers[1]).toBe(enricher1);
    });
  });
});
