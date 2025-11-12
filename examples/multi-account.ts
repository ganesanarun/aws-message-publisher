/**
 * Multi-Account Setup Example
 *
 * This example demonstrates how to configure publishers for multiple AWS accounts.
 * This is useful for cross-account messaging or multi-region deployments.
 */

import { Module, Injectable, Inject } from '@nestjs/common';
import { SNSClient } from '@aws-sdk/client-sns';
import { SQSClient } from '@aws-sdk/client-sqs';
// import {
//   SnsMessagePublisher,
//   SqsMessagePublisher,
//   MessagePublisher,
// } from '@snow-tzu/aws-message-publisher';
import {
  SnsMessagePublisher,
  SqsMessagePublisher,
  MessagePublisher,
} from '../src';

// Define message types
interface OrderEvent {
  orderId: string;
  status: string;
  amount: number;
}

interface InventoryEvent {
  productId: string;
  quantity: number;
  warehouse: string;
}

@Injectable()
export class OrderService {
  constructor(
    @Inject('ORDER_PUBLISHER_US')
    private readonly usPublisher: MessagePublisher<OrderEvent>,
    @Inject('ORDER_PUBLISHER_EU')
    private readonly euPublisher: MessagePublisher<OrderEvent>,
    @Inject('ORDER_QUEUE_PUBLISHER')
    private readonly queuePublisher: MessagePublisher<OrderEvent>
  ) {}

  async createOrder(order: OrderEvent, customerRegion: 'US' | 'EU'): Promise<void> {
    // Publish to a region-specific SNS topic
    const publisher = customerRegion === 'US' ? this.usPublisher : this.euPublisher;
    await publisher.publish(order);

    // Also publish to the processing queue (always US account)
    await this.queuePublisher.publish(order);

    console.log(`✅ Order published to ${customerRegion} topic and processing queue`);
  }
}

/**
 * Inventory Service
 * Publishes inventory updates to an APAC region
 */
@Injectable()
export class InventoryService {
  constructor(
    @Inject('INVENTORY_PUBLISHER_APAC')
    private readonly publisher: MessagePublisher<InventoryEvent>
  ) {}

  async updateInventory(event: InventoryEvent): Promise<void> {
    await this.publisher.publish(event);
    console.log('✅ Inventory update published to APAC region');
  }
}

/**
 * AWS Configuration Module
 * Configures multiple AWS clients for different accounts/regions
 */
@Module({
  providers: [
    // Account A - US East (Production)
    {
      provide: 'ACCOUNT_A_SNS_CLIENT',
      useFactory: () => {
        return new SNSClient({
          region: 'us-east-1',
          credentials: {
            accessKeyId: process.env.ACCOUNT_A_ACCESS_KEY_ID!,
            secretAccessKey: process.env.ACCOUNT_A_SECRET_ACCESS_KEY!,
          },
        });
      },
    },
    {
      provide: 'ACCOUNT_A_SQS_CLIENT',
      useFactory: () => {
        return new SQSClient({
          region: 'us-east-1',
          credentials: {
            accessKeyId: process.env.ACCOUNT_A_ACCESS_KEY_ID!,
            secretAccessKey: process.env.ACCOUNT_A_SECRET_ACCESS_KEY!,
          },
        });
      },
    },

    // Account B - EU West (Compliance/GDPR)
    {
      provide: 'ACCOUNT_B_SNS_CLIENT',
      useFactory: () => {
        return new SNSClient({
          region: 'eu-west-1',
          credentials: {
            accessKeyId: process.env.ACCOUNT_B_ACCESS_KEY_ID!,
            secretAccessKey: process.env.ACCOUNT_B_SECRET_ACCESS_KEY!,
          },
        });
      },
    },

    // Account C - AP Southeast (Asia Pacific)
    {
      provide: 'ACCOUNT_C_SQS_CLIENT',
      useFactory: () => {
        return new SQSClient({
          region: 'ap-southeast-1',
          credentials: {
            accessKeyId: process.env.ACCOUNT_C_ACCESS_KEY_ID!,
            secretAccessKey: process.env.ACCOUNT_C_SECRET_ACCESS_KEY!,
          },
        });
      },
    },
  ],
  exports: ['ACCOUNT_A_SNS_CLIENT', 'ACCOUNT_A_SQS_CLIENT', 'ACCOUNT_B_SNS_CLIENT', 'ACCOUNT_C_SQS_CLIENT'],
})
export class AwsConfigModule {}

/**
 * Order Module
 * Configures publishers for order-related events across multiple accounts
 */
@Module({
  imports: [AwsConfigModule],
  providers: [
    // US Orders Publisher (Account A)
    {
      provide: 'ORDER_PUBLISHER_US',
      useFactory: (snsClient: SNSClient) => {
        const publisher = new SnsMessagePublisher<OrderEvent>(snsClient);
        publisher.configure(config =>
          config.topicArn('test-custom-events')
        );
        return publisher;
      },
      inject: ['ACCOUNT_A_SNS_CLIENT'],
    },

    // EU Orders Publisher (Account B - GDPR compliant)
    {
      provide: 'ORDER_PUBLISHER_EU',
      useFactory: (snsClient: SNSClient) => {
        const publisher = new SnsMessagePublisher<OrderEvent>(snsClient);
        publisher.configure(config =>
          config.topicArn('arn:aws:sns:eu-west-1:222222222222:order-events')
        );
        return publisher;
      },
      inject: ['ACCOUNT_B_SNS_CLIENT'],
    },

    // Order Processing Queue (Account A)
    {
      provide: 'ORDER_QUEUE_PUBLISHER',
      useFactory: (sqsClient: SQSClient) => {
        const publisher = new SqsMessagePublisher<OrderEvent>(sqsClient);
        publisher.configure(config =>
          config.queueUrl('https://sqs.us-east-1.amazonaws.com/111111111111/order-processing')
        );
        return publisher;
      },
      inject: ['ACCOUNT_A_SQS_CLIENT'],
    },
    OrderService,
  ],
  exports: ['ORDER_PUBLISHER_US', 'ORDER_PUBLISHER_EU', 'ORDER_QUEUE_PUBLISHER'],
})
export class OrderModule {}

/**
 * Inventory Module
 * Configures publishers for inventory events in an Asia Pacific region
 */
@Module({
  imports: [AwsConfigModule],
  providers: [
    {
      provide: 'INVENTORY_PUBLISHER_APAC',
      useFactory: (sqsClient: SQSClient) => {
        const publisher = new SqsMessagePublisher<InventoryEvent>(sqsClient);
        publisher.configure(config =>
          config.queueUrl('https://sqs.ap-southeast-1.amazonaws.com/333333333333/inventory-updates')
        );
        return publisher;
      },
      inject: ['ACCOUNT_C_SQS_CLIENT'],
    },

    InventoryService,
  ],
  exports: ['INVENTORY_PUBLISHER_APAC'],
})
export class InventoryModule {}

/**
 * Order Service
 * Uses multiple publishers based on a customer region
 */


/**
 * Example usage (standalone script)
 */
async function standaloneExample() {
  // Create clients for different accounts
  const accountAClient = new SNSClient({
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.ACCOUNT_A_ACCESS_KEY_ID!,
      secretAccessKey: process.env.ACCOUNT_A_SECRET_ACCESS_KEY!,
    },
  });

  const accountBClient = new SNSClient({
    region: 'eu-west-1',
    credentials: {
      accessKeyId: process.env.ACCOUNT_B_ACCESS_KEY_ID!,
      secretAccessKey: process.env.ACCOUNT_B_SECRET_ACCESS_KEY!,
    },
  });

  // Create publishers for each account
  const usPublisher = new SnsMessagePublisher<OrderEvent>(accountAClient);
  usPublisher.configure(config =>
    config.topicArn('arn:aws:sns:us-east-1:111111111111:order-events')
  );

  const euPublisher = new SnsMessagePublisher<OrderEvent>(accountBClient);
  euPublisher.configure(config =>
    config.topicArn('arn:aws:sns:eu-west-1:222222222222:order-events')
  );

  // Publish to a US account
  const usOrder: OrderEvent = {
    orderId: 'US-12345',
    status: 'created',
    amount: 99.99,
  };
  await usPublisher.publish(usOrder);
  console.log('✅ Published to US account');

  // Publish to an EU account
  const euOrder: OrderEvent = {
    orderId: 'EU-67890',
    status: 'created',
    amount: 89.99,
  };
  await euPublisher.publish(euOrder);
  console.log('✅ Published to EU account');
}

// Run a standalone example if executed directly
if (require.main === module) {
  standaloneExample().catch(console.error);
}
