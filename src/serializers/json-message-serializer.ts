import { MessageSerializer, SerializedMessage } from '../interfaces';
import { SerializationError } from '../errors';

/**
 * Default JSON message serializer.
 * Serializes messages to JSON format using JSON.stringify.
 */
export class JsonMessageSerializer<T = any> implements MessageSerializer<T> {
  /**
   * Serialize a message object to JSON format.
   *
   * @param message - The message object to serialize
   * @returns Promise resolving to serialized message with JSON body
   * @throws SerializationError if JSON serialization fails
   */
  async serialize(message: T): Promise<SerializedMessage> {
    try {
      const body = JSON.stringify(message);
      return {
        body,
        contentType: this.getContentType(),
      };
    } catch (error) {
      throw new SerializationError('Failed to serialize message to JSON', error as Error);
    }
  }

  /**
   * Get the content type for JSON serialization.
   *
   * @returns 'application/json'
   */
  getContentType(): string {
    return 'application/json';
  }
}
