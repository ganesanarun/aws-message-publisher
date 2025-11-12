import { PublishContext, TimestampEnricher } from '../../src';

describe('Enrichers Integration', () => {
  describe('Priority ordering', () => {
    it('should have correct priority values', () => {
      const timestampEnricher = new TimestampEnricher();

      expect(timestampEnricher.getPriority()).toBe(30);
    });
  });

  describe('Timestamp enrichment', () => {
    it('should enrich message with timestamp attribute', async () => {
      const message = { id: 1, data: 'test' };
      const context: PublishContext = {};
      const timestampEnricher = new TimestampEnricher();

      const timestampAttrs = await timestampEnricher.enrich(message, context);

      expect(timestampAttrs.timestamp.value).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });
});
