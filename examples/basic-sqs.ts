/**
 * Basic SQS Publisher Example
 *
 * This example demonstrates how to create a simple SQS publisher
 * and publish messages to an AWS SQS queue.
 */

import { SQSClient } from '@aws-sdk/client-sqs';
// import { SqsMessagePublisher } from '@snow-tzu/aws-message-publisher';
import { SqsMessagePublisher, TimestampEnricher } from '../src';

// Define your message type
interface TaskMessage {
  taskId: string;
  taskType: 'email' | 'notification' | 'report';
  payload: Record<string, any>;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
}

async function main() {
  // Step 1: Create AWS SQS client
  const sqsClient = new SQSClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  // Step 2: Create and configure a publisher
  const publisher = new SqsMessagePublisher<TaskMessage>(sqsClient);
  publisher.configure(config =>
    config.queueName('dummy-queue').enrichers([new TimestampEnricher('publishedAt')])
  );

  // Step 3: Publish a message
  const taskMessage: TaskMessage = {
    taskId: 'TASK-12345',
    taskType: 'email',
    payload: {
      to: 'user@example.com',
      subject: 'Welcome!',
      template: 'welcome-email',
    },
    priority: 'high',
    createdAt: new Date(),
  };

  try {
    const result = await publisher.publish(taskMessage);
    console.log('✅ Message published successfully!');
    console.log('Message ID:', result.messageId);
    console.log('Destination:', result.destination);
    console.log('Timestamp:', result.timestamp);
  } catch (error) {
    console.error('❌ Failed to publish message:', error);
    process.exit(1);
  }

  // Example: Publishing with delay (SQS only)
  console.log('\n📤 Publishing message with 30 second delay...');
  try {
    const delayedResult = await publisher.publish(
      {
        taskId: 'TASK-67890',
        taskType: 'notification',
        payload: { message: 'Delayed notification' },
        priority: 'low',
        createdAt: new Date(),
      },
      { delaySeconds: 30 }
    );
    console.log('✅ Delayed message published!');
    console.log('Message ID:', delayedResult.messageId);
  } catch (error) {
    console.error('❌ Failed to publish delayed message:', error);
  }
}

// Run the example
main().catch(console.error);
