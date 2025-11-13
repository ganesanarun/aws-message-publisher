/**
 * Console Logger Example
 *
 * This example demonstrates how to use the built-in console logger
 * with the message publisher for simple logging output.
 */

import { SNSClient } from '@aws-sdk/client-sns';
import { SnsMessagePublisher } from '../src';

interface OrderEvent {
  orderId: string;
  status: 'created' | 'processing' | 'completed';
  timestamp: Date;
}

async function main() {
  // Create AWS SNS client
  const snsClient = new SNSClient({
    region: process.env.AWS_REGION || 'us-east-1',
  });

  // Configure a publisher with console logger
  const publisher = new SnsMessagePublisher<OrderEvent>(snsClient);
  publisher.configure(config => config
    .topicArn('test-custom-events')
    .logger(console)  // Use built-in console logger
  );

  console.log('Publishing message with console logging enabled...\n');

  // Publish a message - logs will appear in the console
  const orderEvent: OrderEvent = {
    orderId: 'ORD-12345',
    status: 'created',
    timestamp: new Date(),
  };

  try {
    const result = await publisher.publish(orderEvent);
    console.log('\n✅ Message published successfully!');
    console.log('Message ID:', result.messageId);
  } catch (error) {
    console.error('\n❌ Failed to publish message:', error);
    process.exit(1);
  }
}

main().catch(console.error);
