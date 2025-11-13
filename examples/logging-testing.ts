/**
 * Testing with Logger Example
 *
 * This example demonstrates how to use the TestLogger utility
 * to verify logging behavior in tests.
 */

import { SNSClient } from '@aws-sdk/client-sns';
import { SnsMessagePublisher, TestLogger } from '../src';

interface OrderEvent {
  orderId: string;
  status: 'created' | 'processing' | 'completed';
  timestamp: Date;
}

async function main() {
  console.log('Testing Logger Example\n');
  console.log('='.repeat(50));

  // Create a test logger to capture logs
  const testLogger = new TestLogger();

  // Create AWS SNS client
  const snsClient = new SNSClient({
    region: process.env.AWS_REGION || 'us-east-1',
  });

  // Configure publisher with test logger
  const publisher = new SnsMessagePublisher<OrderEvent>(snsClient);
  publisher.configure(config => config
    .topicName('order-events')
    .logger(testLogger)
    .logContext({
      service: 'order-service',
      environment: 'test'
    })
  );

  // Publish a message
  const orderEvent: OrderEvent = {
    orderId: 'ORD-12345',
    status: 'created',
    timestamp: new Date(),
  };

  try {
    await publisher.publish(orderEvent);

    // Verify logs were captured
    console.log('\n📋 Captured Logs:');
    console.log('='.repeat(50));

    testLogger.logs.forEach((log, index) => {
      console.log(`\n${index + 1}. [${log.level.toUpperCase()}] ${log.message}`);
      if (log.context) {
        console.log('   Context:', JSON.stringify(log.context, null, 2));
      }
    });

    // Query logs by level
    console.log('\n\n🔍 Query Logs by Level:');
    console.log('='.repeat(50));

    const debugLogs = testLogger.findByLevel('debug');
    console.log(`\nDebug logs: ${debugLogs.length}`);
    debugLogs.forEach(log => {
      console.log(`  - ${log.message}`);
    });

    const infoLogs = testLogger.findByLevel('info');
    console.log(`\nInfo logs: ${infoLogs.length}`);
    infoLogs.forEach(log => {
      console.log(`  - ${log.message}`);
    });

    // Query logs by message
    console.log('\n\n🔎 Query Logs by Message:');
    console.log('='.repeat(50));

    const publishLogs = testLogger.findByMessage('Message published successfully');
    console.log(`\nLogs containing "Message published successfully": ${publishLogs.length}`);
    publishLogs.forEach(log => {
      console.log(`  - [${log.level}] ${log.message}`);
      console.log(`    Message ID: ${log.context?.messageId}`);
    });

    // Assertions (in real tests, use your test framework's assertions)
    console.log('\n\n✅ Assertions:');
    console.log('='.repeat(50));

    const hasDebugLog = debugLogs.some(log => log.message === 'Publishing message');
    console.log(`✓ Has "Publishing message" debug log: ${hasDebugLog}`);

    const hasInfoLog = infoLogs.some(log => log.message === 'Message published successfully');
    console.log(`✓ Has "Message published successfully" info log: ${hasInfoLog}`);

    const hasMessageId = infoLogs.some(log => log.context?.messageId);
    console.log(`✓ Info log contains messageId: ${hasMessageId}`);

    const hasStaticContext = testLogger.logs.every(log =>
      log.context?.service === 'order-service' &&
      log.context?.environment === 'test'
    );
    console.log(`✓ All logs contain static context: ${hasStaticContext}`);

    // Clear logs for next test
    testLogger.clear();
    console.log(`\n✓ Logs cleared: ${testLogger.logs.length} logs remaining`);

    console.log('\n\n✅ Example completed successfully!');
  } catch (error) {
    console.error('\n❌ Example failed:', error);

    // Check error logs
    const errorLogs = testLogger.findByLevel('error');
    if (errorLogs.length > 0) {
      console.log('\n📋 Error Logs:');
      errorLogs.forEach(log => {
        console.log(`  - ${log.message}`);
        console.log(`    Error: ${log.context?.error?.message}`);
      });
    }

    process.exit(1);
  }
}

main().catch(console.error);
