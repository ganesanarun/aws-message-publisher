import { MessageEnricher } from '../interfaces';
import { MessageAttributes, PublishContext } from '../types';

/**
 * Pipeline for executing message enrichers in priority order.
 * Enrichers are sorted by priority (lower values execute first) and executed sequentially.
 * Attributes from all enrichers are merged, with later enrichers overwriting earlier ones on conflict.
 */
export class EnrichmentPipeline {
  private readonly sortedEnrichers: MessageEnricher[];

  /**
   * Create a new enrichment pipeline.
   *
   * @param enrichers - Array of message enrichers to execute
   */
  constructor(enrichers: MessageEnricher[]) {
    // Sort enrichers by priority (lower values execute first)
    this.sortedEnrichers = [...enrichers].sort((a, b) => {
      const priorityA = a.getPriority?.() ?? 100;
      const priorityB = b.getPriority?.() ?? 100;
      return priorityA - priorityB;
    });
  }

  /**
   * Execute all enrichers and merge their attributes.
   * Enrichers are executed in priority order (lower priority values first).
   * If an enricher fails, the error is logged and execution continues with remaining enrichers.
   * Conflicting attributes are resolved by using the value from the last enricher.
   *
   * @param message - The message being published
   * @param context - The publish context containing runtime information
   * @returns Promise resolving to merged message attributes from all enrichers
   */
  async enrich(message: any, context: PublishContext): Promise<MessageAttributes> {
    const allAttributes: MessageAttributes = {};

    for (const enricher of this.sortedEnrichers) {
      try {
        const attributes = await enricher.enrich(message, context);
        // Merge attributes, with later enrichers overwriting earlier ones
        Object.assign(allAttributes, attributes);
      } catch (error) {
        // Log error but continue with other enrichers
        console.error(
          `Enricher ${enricher.constructor.name} failed:`,
          error instanceof Error ? error.message : error
        );
      }
    }

    return allAttributes;
  }

  /**
   * Get the enrichers in their execution order.
   *
   * @returns Array of enrichers sorted by priority
   */
  getEnrichers(): MessageEnricher[] {
    return [...this.sortedEnrichers];
  }
}
