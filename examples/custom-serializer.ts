/**
 * Custom Serializer Example
 *
 * This example demonstrates how to implement and use a custom message serializer.
 * In this case, we create a simple XML serializer.
 */

import { SNSClient } from '@aws-sdk/client-sns';
import { SQSClient } from '@aws-sdk/client-sqs';
// import {
//   SnsMessagePublisher,
//   MessageSerializer,
//   SerializedMessage,
// } from '@snow-tzu/aws-message-publisher';
import {
  MessageSerializer,
  SerializedMessage,
  SnsMessagePublisher,
  SqsMessagePublisher,
} from '../src';

// Define your message type
interface ProductEvent {
  productId: string;
  name: string;
  price: number;
  category: string;
}

/**
 * Simple XML serializer implementation
 */
class XmlMessageSerializer implements MessageSerializer<ProductEvent> {
  async serialize(message: ProductEvent): Promise<SerializedMessage> {
    // Convert message to simple XML format
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ProductEvent>
  <productId>${this.escapeXml(message.productId)}</productId>
  <name>${this.escapeXml(message.name)}</name>
  <price>${message.price}</price>
  <category>${this.escapeXml(message.category)}</category>
</ProductEvent>`;

    return {
      body: xml,
      contentType: this.getContentType(),
    };
  }

  getContentType(): string {
    return 'application/xml';
  }

  private escapeXml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

/**
 * CSV serializer for tabular data
 */
class CsvMessageSerializer implements MessageSerializer<ProductEvent> {
  async serialize(message: ProductEvent): Promise<SerializedMessage> {
    // Convert message to CSV format
    const csv = `productId,name,price,category\n${message.productId},"${message.name}",${message.price},"${message.category}"`;

    return {
      body: csv,
      contentType: this.getContentType(),
    };
  }

  getContentType(): string {
    return 'text/csv';
  }
}

class MyCustomMessageSerializer implements MessageSerializer<ProductEvent> {
  async serialize(message: ProductEvent): Promise<SerializedMessage> {
    // Convert message to proprietary format
    const proprietary = `productId|name|price|category\n${message.productId}|${message.name}|${message.price}|${message.category}`;

    return {
      body: proprietary,
      contentType: this.getContentType(),
    };
  }

  getContentType(): string {
    return 'text/proprietary';
  }
}

async function main() {
  const snsClient = new SNSClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  const sqsClient = new SQSClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  // Example 1: Using XML serializer
  const xmlPublisher = new SnsMessagePublisher<ProductEvent>(snsClient);
  xmlPublisher.configure(config =>
    config.topicArn('test-custom-events').serializer(new XmlMessageSerializer())
  );

  const csvPublisher = new SnsMessagePublisher<ProductEvent>(snsClient);
  csvPublisher.configure(config =>
    config.topicArn('test-custom-events').serializer(new CsvMessageSerializer())
  );

  const jsonPublisher = new SnsMessagePublisher<ProductEvent>(snsClient);
  jsonPublisher.configure(config => config.topicArn('test-custom-events'));

  const sqsPublisher = new SqsMessagePublisher<ProductEvent>(sqsClient).configure(config => {
    config.queueName('dummy-queue').serializer(new MyCustomMessageSerializer());
  });

  const productEvent: ProductEvent = {
    productId: 'PROD-12345',
    name: 'Wireless Headphones',
    price: 79.99,
    category: 'Electronics',
  };

  try {
    console.log('📤 Publishing with XML serializer...');
    const result = await xmlPublisher.publish(productEvent);
    console.log('✅ XML message published!');
    console.log('Message ID:', result.messageId);
  } catch (error) {
    console.error('❌ Failed to publish XML message:', error);
  }

  // Example 2: Using CSV serializer
  try {
    console.log('\n📤 Publishing with CSV serializer...');
    const result = await csvPublisher.publish(productEvent);
    console.log('✅ CSV message published!');
    console.log('Message ID:', result.messageId);
  } catch (error) {
    console.error('❌ Failed to publish CSV message:', error);
  }

  // Example 3: Default JSON serializer (no custom serializer specified)
  try {
    console.log('\n📤 Publishing with default JSON serializer...');
    const result = await jsonPublisher.publish(productEvent);
    console.log('✅ JSON message published!');
    console.log('Message ID:', result.messageId);
  } catch (error) {
    console.error('❌ Failed to publish JSON message:', error);
  }

  // Example 4: Using custom serializer with SQS publisher
  try {
    console.log('\nPublishing with custom serializer...');
    const result = await sqsPublisher.publish(productEvent);
    console.log('✅ SQS message published with custom serializer!');
    console.log('Message ID:', result.messageId);
  } catch (error) {
    console.error('❌ Failed to publish message with custom serializer:', error);
  }
}

// Run the example
main().catch(console.error);
