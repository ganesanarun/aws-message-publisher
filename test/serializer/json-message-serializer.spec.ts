import { JsonMessageSerializer, SerializationError } from '../../src';

describe('JsonMessageSerializer', () => {
  let serializer: JsonMessageSerializer;

  beforeEach(() => {
    serializer = new JsonMessageSerializer();
  });

  describe('serialize', () => {
    it('should serialize a simple object to JSON', async () => {
      const message = { id: 1, name: 'Test' };

      const result = await serializer.serialize(message);

      expect(result.body).toBe(JSON.stringify(message));
      expect(result.contentType).toBe('application/json');
    });

    it('should serialize a complex nested object to JSON', async () => {
      const message = {
        id: 1,
        user: { name: 'John', email: 'john@example.com' },
        items: [
          { id: 1, qty: 2 },
          { id: 2, qty: 5 },
        ],
      };

      const result = await serializer.serialize(message);

      expect(result.body).toBe(JSON.stringify(message));
      expect(result.contentType).toBe('application/json');
    });

    it('should serialize arrays to JSON', async () => {
      const message = [1, 2, 3, 4, 5];

      const result = await serializer.serialize(message);

      expect(result.body).toBe(JSON.stringify(message));
      expect(result.contentType).toBe('application/json');
    });

    it('should serialize primitive values to JSON', async () => {
      const message = 'test string';

      const result = await serializer.serialize(message);

      expect(result.body).toBe(JSON.stringify(message));
      expect(result.contentType).toBe('application/json');
    });

    it('should throw SerializationError when serialization fails', async () => {
      const circularRef: any = { name: 'test' };
      circularRef.self = circularRef;

      await expect(serializer.serialize(circularRef)).rejects.toThrow(SerializationError);
    });

    it('should include descriptive error message on serialization failure', async () => {
      const circularRef: any = { name: 'test' };
      circularRef.self = circularRef;

      await expect(serializer.serialize(circularRef)).rejects.toThrow(
        'Failed to serialize message to JSON'
      );
    });
  });

  describe('getContentType', () => {
    it('should return application/json', () => {
      expect(serializer.getContentType()).toBe('application/json');
    });
  });
});
