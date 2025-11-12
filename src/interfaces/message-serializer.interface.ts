/**
 * Represents a serialized message ready for transmission.
 */
export interface SerializedMessage {
  /**
   * The serialized message body as a string or binary buffer
   */
  body: string | Buffer;

  /**
   * MIME type of the serialized content (e.g., 'application/json', 'application/xml')
   */
  contentType: string;
}

/**
 * Interface for message serializers.
 * Implementations convert message objects to transmittable formats.
 */
export interface MessageSerializer<T = any> {
  /**
   * Serialize a message object to a transmittable format.
   *
   * @param message - The message object to serialize
   * @returns Promise resolving to serialized message with body and content type
   * @throws SerializationError if serialization fails
   */
  serialize(message: T): Promise<SerializedMessage>;

  /**
   * Get the content type for messages serialized by this serializer.
   *
   * @returns MIME type string (e.g., 'application/json')
   */
  getContentType(): string;
}
