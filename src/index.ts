/**
 * @snow-tzu/aws-message-publisher
 *
 * Production-ready TypeScript package for publishing messages to AWS SNS and SQS
 * with NestJS integration, message enrichment, and flexible serialization.
 */

// Core interfaces
export * from './interfaces';

// Types
export * from './types';

// Configuration
export * from './configuration';

// Publishers
export * from './publishers/sns-message-publisher';
export * from './publishers/sqs-message-publisher';

// Serializers
export * from './serializers';

// Enrichers
export * from './enrichers';

// Errors
export * from './errors';

// Pipeline
export * from './pipeline';
// Logging
export { Logger } from './interfaces/logger.interface';
export { LogContext } from './types/log-context';
export { NoOpLogger } from './logging/no-op-logger';

// Testing utilities
export { TestLogger, LogEntry } from './testing';

// Logger adapters
export { NestLoggerAdapter } from './adapters';
