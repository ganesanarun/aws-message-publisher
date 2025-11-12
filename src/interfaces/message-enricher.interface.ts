import { MessageAttributes } from '../types';
import { PublishContext } from '../types';

/**
 * Interface for message enrichers.
 * Enrichers add metadata attributes to messages before publishing.
 */
export interface MessageEnricher {
  /**
   * Enrich a message with additional metadata attributes.
   *
   * @param message - The message being published
   * @param context - The publish context containing runtime information
   * @returns Promise resolving to message attributes to add to the message
   */
  enrich(message: any, context: PublishContext): Promise<MessageAttributes>;

  /**
   * Get the priority for this enricher's execution order.
   * Lower values execute earlier. Default is 100 if not specified.
   *
   * @returns Priority number (lower = earlier execution)
   */
  getPriority?(): number;
}
