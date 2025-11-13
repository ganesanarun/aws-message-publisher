/**
 * Pino Logger Example
 *
 * This example demonstrates how to integrate Pino logger
 * with the message publisher for high-performance structured logging.
 *
 * Install Pino: npm install pino pino-pretty
 */

import { SNSClient } from '@aws-sdk/client-sns';
import { SnsMessagePublisher } from '../src';
import pino from 'pino';

interface OrderEvent {
  orderId: string;
  customerId: string;
  status: 'created' | 'processing' | 'completed';
  amount: number;
  timestamp: Date;
}

async function main() {
  // Create Pino logger with pretty printing
  const logger = pino({
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname'
      }
    }
  });

  // Create AWS SNS client
  const snsClient = new SNSClient({
    region: process.env.AWS_REGION || 'us-east-1',
  });

  // Configure a publisher with Pino logger and static context
  const publisher = new SnsMessagePublisher<OrderEvent>(snsClient);
  publisher.configure(config => config
    .topicName('test-custom-events')
    .logger(logger)
    .logContext({
      service: 'order-service',
      environment: process.env.NODE_ENV || 'development'
    })
  );

  logger.info('Starting message publishing example with Pino');

  // Publish a message
  const orderEvent: OrderEvent = {
    orderId: 'ORD-12345',
    customerId: 'CUST-67890',
    status: 'created',
    amount: 99.99,
    timestamp: new Date(),
  };

  try {
    const result = await publisher.publish(orderEvent);
    logger.info({
      messageId: result.messageId,
      destination: result.destination
    }, 'Message published successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to publish message');
    process.exit(1);
  }
}

main().catch(console.error);
