import { MessageEnricher } from '../interfaces';
import { MessageAttributes, PublishContext } from '../types';

/**
 * Enricher that adds ISO 8601 timestamp to messages.
 * Captures the timestamp at message publishing time.
 */
export class TimestampEnricher implements MessageEnricher {
  constructor(
    private readonly fieldName: string = 'timestamp',
    private readonly dateFormatted: (date: Date) => string = date => date.toISOString()
  ) {}
  /**
   * Enrich a message with a timestamp attribute.
   *
   * @param _message - The message being published
   * @param _context - The publication context containing runtime information
   * @returns Promise resolving to message attributes with timestamp
   */
  async enrich(_message: any, _context: PublishContext): Promise<MessageAttributes> {
    return {
      [this.fieldName]: {
        dataType: 'String',
        value: this.dateFormatted(new Date()),
      },
    };
  }

  /**
   * Get the priority for this enricher's execution order.
   * Lower values execute earlier.
   *
   * @returns Priority number (30 = medium priority)
   */
  getPriority(): number {
    return 30;
  }
}
