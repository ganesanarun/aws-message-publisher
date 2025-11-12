import { PublishContext } from '../types';

/**
 * Interface for context resolvers.
 * Resolvers extract contextual information from the execution environment.
 */
export interface ContextResolver {
  /**
   * Resolve context from the current execution environment.
   *
   * @returns Promise resolving to publish context with runtime information
   */
  resolve(): Promise<PublishContext>;
}
