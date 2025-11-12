/**
 * Batch Publishing Example
 *
 * This example demonstrates how to publish multiple messages efficiently
 * using batch operations. Batch publishing is ideal for high-throughput scenarios.
 */

import { SNSClient } from '@aws-sdk/client-sns';
import { SQSClient } from '@aws-sdk/client-sqs';
// import {
//   SnsMessagePublisher,
//   SqsMessagePublisher,
//   TraceEnricher,
//   TimestampEnricher,
// } from '@snow-tzu/aws-message-publisher';
import {
  SnsMessagePublisher,
  SqsMessagePublisher,
  TimestampEnricher,
} from '../src';

// Define message types
interface UserEvent {
  userId: string;
  action: 'created' | 'updated' | 'deleted';
  email: string;
  timestamp: Date;
}

interface LogEntry {
  level: 'info' | 'warn' | 'error';
  message: string;
  service: string;
  timestamp: Date;
}

/**
 * Example 1: Batch publishing to SNS
 */
async function batchPublishToSns() {
  console.log('📤 Batch Publishing to SNS...\n');

  const snsClient = new SNSClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  const publisher = new SnsMessagePublisher<UserEvent>(snsClient);
  publisher.configure(config =>
    config
      .topicArn('test-custom-events')
      .addEnricher(new TimestampEnricher())
  );

  // Create a batch of user events
  const userEvents: UserEvent[] = [
    { userId: 'user-001', action: 'created', email: 'user1@example.com', timestamp: new Date() },
    { userId: 'user-002', action: 'created', email: 'user2@example.com', timestamp: new Date() },
    { userId: 'user-003', action: 'updated', email: 'user3@example.com', timestamp: new Date() },
    { userId: 'user-004', action: 'created', email: 'user4@example.com', timestamp: new Date() },
    { userId: 'user-005', action: 'deleted', email: 'user5@example.com', timestamp: new Date() },
  ];

  try {
    const result = await publisher.publishBatch(userEvents);

    console.log('✅ Batch publish completed!');
    console.log(`Total messages: ${result.totalCount}`);
    console.log(`Successful: ${result.successCount}`);
    console.log(`Failed: ${result.failureCount}`);

    // Display successful messages
    if (result.successful.length > 0) {
      console.log('\n📨 Successfully published messages:');
      result.successful.forEach((msg, index) => {
        console.log(`  ${index + 1}. Message ID: ${msg.messageId}`);
      });
    }

    // Handle failures
    if (result.failed.length > 0) {
      console.log('\n❌ Failed messages:');
      result.failed.forEach(failure => {
        console.log(`  Index ${failure.index}: ${failure.error.message}`);
      });
    }
  } catch (error) {
    console.error('❌ Batch publish failed:', error);
  }
}

/**
 * Example 2: Batch publishing to SQS
 */
async function batchPublishToSqs() {
  console.log('\n📤 Batch Publishing to SQS...\n');

  const sqsClient = new SQSClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  const publisher = new SqsMessagePublisher<LogEntry>(sqsClient);
  publisher.configure(config =>
    config.queueUrl(
      'dummy-queue'
    )
  );

  // Create a batch of log entries
  const logEntries: LogEntry[] = [
    { level: 'info', message: 'Application started', service: 'api', timestamp: new Date() },
    { level: 'info', message: 'Database connected', service: 'api', timestamp: new Date() },
    { level: 'warn', message: 'High memory usage', service: 'worker', timestamp: new Date() },
    { level: 'error', message: 'Failed to process job', service: 'worker', timestamp: new Date() },
    { level: 'info', message: 'Cache cleared', service: 'api', timestamp: new Date() },
  ];

  try {
    const result = await publisher.publishBatch(logEntries);

    console.log('✅ Batch publish completed!');
    console.log(`Total messages: ${result.totalCount}`);
    console.log(`Successful: ${result.successCount}`);
    console.log(`Failed: ${result.failureCount}`);

    if (result.successful.length > 0) {
      console.log('\n📨 Successfully published messages:');
      result.successful.forEach((msg, index) => {
        console.log(`  ${index + 1}. Message ID: ${msg.messageId}`);
      });
    }

    if (result.failed.length > 0) {
      console.log('\n❌ Failed messages:');
      result.failed.forEach(failure => {
        console.log(`  Index ${failure.index}: ${failure.error.message}`);
      });
    }
  } catch (error) {
    console.error('❌ Batch publish failed:', error);
  }
}

/**
 * Example 3: Large batch with automatic chunking
 * AWS limits batches to 10 messages, but the publisher handles chunking automatically
 */
async function largeBatchPublish() {
  console.log('\n📤 Large Batch Publishing (automatic chunking)...\n');

  const snsClient = new SNSClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  const publisher = new SnsMessagePublisher<UserEvent>(snsClient);
  publisher.configure(config =>
    config.topicArn('test-custom-events')
  );

  // Create a large batch (more than AWS limit of 10)
  const largeUserBatch: UserEvent[] = Array.from({ length: 25 }, (_, i) => ({
    userId: `user-${String(i + 1).padStart(3, '0')}`,
    action: 'created' as const,
    email: `user${i + 1}@example.com`,
    timestamp: new Date(),
  }));

  console.log(`Publishing ${largeUserBatch.length} messages...`);
  console.log('(Will be automatically chunked into batches of 10)\n');

  try {
    const startTime = Date.now();
    const result = await publisher.publishBatch(largeUserBatch);
    const duration = Date.now() - startTime;

    console.log('✅ Large batch publish completed!');
    console.log(`Total messages: ${result.totalCount}`);
    console.log(`Successful: ${result.successCount}`);
    console.log(`Failed: ${result.failureCount}`);
    console.log(`Duration: ${duration}ms`);
    console.log(`Throughput: ${Math.round((result.successCount / duration) * 1000)} msg/sec`);
  } catch (error) {
    console.error('❌ Large batch publish failed:', error);
  }
}

/**
 * Example 4: Handling partial failures
 */
async function handlePartialFailures() {
  console.log('\n📤 Batch Publishing with Failure Handling...\n');

  const snsClient = new SNSClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  const publisher = new SnsMessagePublisher<UserEvent>(snsClient);
  publisher.configure(config =>
    config.topicArn('test-custom-events')
  );

  const messages: UserEvent[] = [
    { userId: 'user-001', action: 'created', email: 'user1@example.com', timestamp: new Date() },
    { userId: 'user-002', action: 'created', email: 'user2@example.com', timestamp: new Date() },
    { userId: 'user-003', action: 'created', email: 'user3@example.com', timestamp: new Date() },
  ];

  try {
    const result = await publisher.publishBatch(messages, {
      continueOnError: true, // Continue even if some messages fail
    });

    // Retry failed messages
    if (result.failed.length > 0) {
      console.log(`\n🔄 Retrying ${result.failed.length} failed messages...`);

      for (const failure of result.failed) {
        try {
          await publisher.publish(failure.message);
          console.log(`✅ Retry successful for message at index ${failure.index}`);
        } catch (retryError) {
          console.error(`❌ Retry failed for message at index ${failure.index}:`, retryError);
        }
      }
    }
  } catch (error) {
    console.error('❌ Batch publish failed:', error);
  }
}

/**
 * Main function to run all examples
 */
async function main() {
  console.log('🚀 Batch Publishing Examples\n');
  console.log('='.repeat(50));

  try {
    await batchPublishToSns();
    await batchPublishToSqs();
    await largeBatchPublish();
    await handlePartialFailures();

    console.log('\n' + '='.repeat(50));
    console.log('✅ All examples completed!');
  } catch (error) {
    console.error('\n❌ Example failed:', error);
    process.exit(1);
  }
}

// Run the examples
main().catch(console.error);
