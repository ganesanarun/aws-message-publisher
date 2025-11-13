/**
 * OpenTelemetry Logger Example
 *
 * This example demonstrates how to create a custom logger that integrates
 * with OpenTelemetry for distributed tracing and observability.
 *
 * Install OpenTelemetry: npm install @opentelemetry/api pino
 */

import { context, SpanStatusCode, trace } from '@opentelemetry/api';
import { SNSClient } from '@aws-sdk/client-sns';
import { Logger, SnsMessagePublisher } from '../src';
import pino from 'pino';

interface OrderEvent {
  orderId: string;
  customerId: string;
  status: 'created' | 'processing' | 'completed';
  amount: number;
  timestamp: Date;
}

/**
 * Custom logger that integrates with OpenTelemetry spans
 * and also logs to Pino for structured logging
 */
class OpenTelemetryLogger implements Logger {
  private readonly baseLogger: pino.Logger;

  constructor() {
    this.baseLogger = pino({
      level: 'debug',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
        },
      },
    });
  }

  debug(message: string, ctx?: Record<string, any>): void {
    const span = trace.getActiveSpan();
    if (span) {
      span.addEvent('debug', { message, ...ctx });
    }
    this.baseLogger.debug(ctx, message);
  }

  info(message: string, ctx?: Record<string, any>): void {
    const span = trace.getActiveSpan();
    if (span) {
      span.addEvent('info', { message, ...ctx });
    }
    this.baseLogger.info(ctx, message);
  }

  warn(message: string, ctx?: Record<string, any>): void {
    const span = trace.getActiveSpan();
    if (span) {
      span.addEvent('warn', { message, ...ctx });
    }
    this.baseLogger.warn(ctx, message);
  }

  error(message: string, ctx?: Record<string, any>): void {
    const span = trace.getActiveSpan();
    if (span) {
      span.addEvent('error', { message, ...ctx });
      if (ctx?.error) {
        span.recordException(ctx.error);
        span.setStatus({ code: SpanStatusCode.ERROR });
      }
    }
    this.baseLogger.error(ctx, message);
  }
}

async function main() {
  // Create custom OpenTelemetry logger
  const logger = new OpenTelemetryLogger();

  // Create AWS SNS client
  const snsClient = new SNSClient({
    region: process.env.AWS_REGION || 'us-east-1',
  });

  // Configure a publisher with OpenTelemetry logger
  const publisher = new SnsMessagePublisher<OrderEvent>(snsClient);
  publisher.configure(config =>
    config
      .topicName('test-custom-events')
      .logger(logger)
      .logContext({
        service: 'order-service',
        environment: process.env.NODE_ENV || 'development',
      })
  );

  logger.info('Starting message publishing with OpenTelemetry integration');

  // Create a span for the operation
  const tracer = trace.getTracer('order-service');
  const span = tracer.startSpan('publish-order-event');

  try {
    // Execute within span context
    await context.with(trace.setSpan(context.active(), span), async () => {
      const orderEvent: OrderEvent = {
        orderId: 'ORD-12345',
        customerId: 'CUST-67890',
        status: 'created',
        amount: 99.99,
        timestamp: new Date(),
      };

      const result = await publisher.publish(orderEvent);

      span.setAttributes({
        'message.id': result.messageId,
        'order.id': orderEvent.orderId,
        'order.amount': orderEvent.amount,
      });

      logger.info('Message published successfully', {
        messageId: result.messageId,
        orderId: orderEvent.orderId,
      });
    });

    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    logger.error('Failed to publish message', { error });
    throw error;
  } finally {
    span.end();
  }
}

main().catch(console.error);
