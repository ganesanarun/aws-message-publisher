import { PublishContext, TimestampEnricher } from '../../src';

describe('TimestampEnricher', () => {
  let enricher: TimestampEnricher;

  beforeEach(() => {
    enricher = new TimestampEnricher();
  });

  describe('enrich', () => {
    it('should generate ISO 8601 timestamp', async () => {
      const message = { id: 1, data: 'test' };
      const context: PublishContext = {};

      const result = await enricher.enrich(message, context);

      expect(result.timestamp).toBeDefined();
      expect(result.timestamp.dataType).toBe('String');
      expect(typeof result.timestamp.value).toBe('string');
      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
      expect(result.timestamp.value).toMatch(isoRegex);
    });

    it('should generate valid Date from timestamp', async () => {
      const message = { id: 1, data: 'test' };
      const context: PublishContext = {};

      const result = await enricher.enrich(message, context);

      const date = new Date(result.timestamp.value as string);
      expect(date.toString()).not.toBe('Invalid Date');
    });

    it('should generate current timestamp', async () => {
      const before = new Date();
      const message = { id: 1, data: 'test' };
      const context: PublishContext = {};

      const result = await enricher.enrich(message, context);

      const after = new Date();
      const timestamp = new Date(result.timestamp.value as string);
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('getPriority', () => {
    it('should return priority 30', () => {
      expect(enricher.getPriority()).toBe(30);
    });
  });
});
