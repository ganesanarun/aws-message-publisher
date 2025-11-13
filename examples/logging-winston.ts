/**
 * Winston Logger Example
 *
 * This example demonstrates how to integrate Winston logger
 * with the message publisher for structured JSON logging.
 *
 * Install Winston: npm install winston
 */

import { SNSClient } from '@aws-sdk/client-sns';
import { SnsMessagePublisher } from '../src';
import winston from 'winston';

interface OrderEvent {
  orderId: string;
  customerId: string;
  status: 'created' | 'processing' | 'completed';
  amount: number;
  timestamp: Date;
}

async function main() {
  // Create Winston logger with JSON format
  const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ level, message, timestamp, ...meta }) => {
            const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
            return `${timestamp} [${level}]: ${message} ${metaStr}`;
          })
        )
      }),
      new winston.transports.File({
        filename: 'publisher.log',
        format: winston.format.json()
      })
    ]
  });

  // Create AWS SNS client
  const snsClient = new SNSClient({
    region: process.env.AWS_REGION || 'us-east-1',
  });

  // Configure a publisher with Winston logger and static context
  const publisher = new SnsMessagePublisher<OrderEvent>(snsClient);
  publisher.configure(config => config
    .topicName('test-custom-events')
    .logger(logger)
    .logContext({
      service: 'order-service',
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0'
    })
  );

  logger.info('Starting message publishing example with Winston');

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
    logger.info('Message published successfully', {
      messageId: result.messageId,
      destination: result.destination
    });
  } catch (error) {
    logger.error('Failed to publish message', { error });
    process.exit(1);
  }
}

main().catch(console.error);
