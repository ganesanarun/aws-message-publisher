/**
 * Basic SNS Publisher Example
 *
 * This example demonstrates how to create a simple SNS publisher
 * and publish messages to an AWS SNS topic.
 */

import { SNSClient } from '@aws-sdk/client-sns';
// import { SnsMessagePublisher } from '@snow-tzu/aws-message-publisher';
import { SnsMessagePublisher } from '../src';

// Define your message type
interface OrderEvent {
  orderId: string;
  customerId: string;
  status: 'created' | 'processing' | 'completed' | 'cancelled';
  amount: number;
  timestamp: Date;
}

async function main() {
  // Step 1: Create AWS SNS client
  const snsClient = new SNSClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  // Step 2: Create and configure a publisher
  const publisher = new SnsMessagePublisher<OrderEvent>(snsClient);
  publisher.configure(config => config.topicName('test-events'));

  // Step 3: Publish a message
  const orderEvent: OrderEvent = {
    orderId: 'ORD-12345',
    customerId: 'CUST-67890',
    status: 'created',
    amount: 99.99,
    timestamp: new Date(),
  };

  try {
    const result = await publisher.publish(orderEvent);
    console.log('✅ Message published successfully!');
    console.log('Message ID:', result.messageId);
    console.log('Destination:', result.destination);
    console.log('Timestamp:', result.timestamp);
  } catch (error) {
    console.error('❌ Failed to publish message:', error);
    process.exit(1);
  }
}

// Run the example
main().catch(console.error);
