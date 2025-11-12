/**
 * Represents a single message attribute value with its data type.
 * Compatible with AWS SNS and SQS message attribute format.
 */
export interface MessageAttributeValue {
  /**
   * Data type of the attribute value
   */
  dataType: 'String' | 'Number' | 'Binary';

  /**
   * The attribute value (string, number, or binary buffer)
   */
  value: string | number | Buffer;
}

/**
 * Collection of message attributes as key-value pairs.
 * Used for message metadata and filtering.
 */
export type MessageAttributes = Record<string, MessageAttributeValue>;
