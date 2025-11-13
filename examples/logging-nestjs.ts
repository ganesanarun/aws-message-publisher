/**
 * NestJS Logger Example
 *
 * This example demonstrates how to integrate NestJS Logger
 * with the message publisher in a NestJS application.
 *
 * Install NestJS: npm install @nestjs/common @nestjs/core reflect-metadata rxjs
 */

import { Logger as NestLogger } from '@nestjs/common';
import { SNSClient } from '@aws-sdk/client-sns';
import { SnsMessagePublisher, NestLoggerAdapter } from '../src';

interface OrderEvent {
  orderId: string;
  customerId: string;
  status: 'created' | 'processing' | 'completed';
  amount: number;
  timestamp: Date;
}

/**
 * Example NestJS Service using the publisher with NestJS Logger
 */
class OrderPublisherService {
  private readonly logger = new NestLogger(OrderPublisherService.name);
  private readonly publisher: SnsMessagePublisher<OrderEvent>;

  constructor(snsClient: SNSClient) {
    // Wrap NestJS logger with the provided adapter
    const loggerAdapter = new NestLoggerAdapter(this.logger);

    // Configure a publisher with adapted NestJS logger
    this.publisher = new SnsMessagePublisher<OrderEvent>(snsClient);
    this.publisher.configure(config => config
      .topicArn('test-custom-events')
      .logger(loggerAdapter)
      .logContext({
        service: 'order-service',
        context: OrderPublisherService.name
      })
    );
  }

  async publishOrderCreated(orderEvent: OrderEvent): Promise<void> {
    this.logger.log('Publishing order created event', {
      orderId: orderEvent.orderId
    });

    try {
      const result = await this.publisher.publish(orderEvent);
      this.logger.log('Order event published successfully', {
        messageId: result.messageId,
        orderId: orderEvent.orderId
      });
    } catch (error) {
      this.logger.error('Failed to publish order event', (error as Error).stack, {
        orderId: orderEvent.orderId
      });
      throw error;
    }
  }
}

async function main() {
  // Create AWS SNS client
  const snsClient = new SNSClient({
    region: process.env.AWS_REGION || 'us-east-1',
  });

  // Create a service instance
  const orderService = new OrderPublisherService(snsClient);

  // Publish a message
  const orderEvent: OrderEvent = {
    orderId: 'ORD-12345',
    customerId: 'CUST-67890',
    status: 'created',
    amount: 99.99,
    timestamp: new Date(),
  };

  try {
    await orderService.publishOrderCreated(orderEvent);
    console.log('\n✅ Example completed successfully!');
  } catch (error) {
    console.error('\n❌ Example failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
