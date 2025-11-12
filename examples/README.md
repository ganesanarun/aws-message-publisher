# Examples

This directory contains working examples demonstrating various features of @snow-tzu/aws-message-publisher.

## Prerequisites

Before running these examples, ensure you have:

1. Node.js >= 18.0.0 installed
2. AWS credentials configured (via environment variables or AWS config)
3. Required AWS resources (SNS topics, SQS queues) created
4. Package installed: `yarn add @snow-tzu/aws-message-publisher`

## Environment Variables

Set the following environment variables before running the examples:

```bash
# AWS Credentials
export AWS_ACCESS_KEY_ID="your-access-key-id"
export AWS_SECRET_ACCESS_KEY="your-secret-access-key"
export AWS_REGION="us-east-1"

# SNS Configuration
export SNS_TOPIC_ARN="arn:aws:sns:us-east-1:123456789:your-topic"

# SQS Configuration
export SQS_QUEUE_URL="https://sqs.us-east-1.amazonaws.com/123456789/your-queue"

# Multi-Account Configuration (for multi-account example)
export ACCOUNT_A_ACCESS_KEY_ID="account-a-key"
export ACCOUNT_A_SECRET_ACCESS_KEY="account-a-secret"
export ACCOUNT_B_ACCESS_KEY_ID="account-b-key"
export ACCOUNT_B_SECRET_ACCESS_KEY="account-b-secret"
export ACCOUNT_C_ACCESS_KEY_ID="account-c-key"
export ACCOUNT_C_SECRET_ACCESS_KEY="account-c-secret"
```

## Running Examples

### Basic SNS Publisher

Demonstrates simple SNS message publishing:

```bash
npx ts-node examples/basic-sns.ts
```

**Features demonstrated:**

- Creating an SNS client
- Configuring a publisher with topic ARN
- Publishing a single message
- Handling publishes results

### Basic SQS Publisher

Demonstrates simple SQS message publishing:

```bash
npx ts-node examples/basic-sqs.ts
```

**Features demonstrated:**

- Creating an SQS client
- Configuring a publisher with queue URL
- Publishing messages
- Using delay seconds (SQS-specific feature)

### Custom Serializer

Demonstrates implementing and using custom message serializers:

```bash
npx ts-node examples/custom-serializer.ts
```

**Features demonstrated:**

- Implementing custom XML serializer
- Implementing custom CSV serializer
- Using default JSON serializer
- Configuring publishers with different serializers

### Multi-Account Setup

Demonstrates configuring publishers for multiple AWS accounts:

```bash
npx ts-node examples/multi-account.ts
```

**Features demonstrated:**

- Configuring multiple AWS clients for different accounts
- Setting up region-specific publishers
- NestJS module configuration pattern
- Cross-account message publishing
- Service-level publisher injection

### Batch Publishing

Demonstrates efficient batch message publishing:

```bash
npx ts-node examples/batch-publishing.ts
```

**Features demonstrated:**

- Publishing multiple messages in batch
- Automatic chunking for AWS limits
- Handling batch results (success/failure)
- Retrying failed messages
- Performance metrics

## Example Structure

Each example follows this structure:

1. **Imports**: Required dependencies and types
2. **Type Definitions**: Message interfaces for type safety
3. **Configuration**: AWS client and publisher setup
4. **Publishing Logic**: Actual message publishing code
5. **Error Handling**: Proper error handling and logging

## TypeScript Compilation

If you prefer to compile and run the examples:

```bash
# Compile TypeScript
npx tsc examples/basic-sns.ts --outDir dist/examples

# Run compiled JavaScript
node dist/examples/basic-sns.js
```

## Integration with NestJS

The multi-account example demonstrates the recommended pattern for integrating with NestJS:

1. Create an AWS configuration module with client providers
2. Create feature modules with publisher providers
3. Inject publishers into services
4. Use publishers in business logic

## Troubleshooting

### "AccessDenied" Error

Ensure your AWS credentials have the necessary permissions:

**For SNS:**

- `sns:Publish`
- `sns:GetTopicAttributes`

**For SQS:**

- `sqs:SendMessage`
- `sqs:GetQueueUrl`

### "Topic/Queue Not Found" Error

Verify that:

- The topic ARN or queue URL is correct
- The resource exists in the specified region
- Your credentials have access to the resource

### TypeScript Errors

If you encounter TypeScript errors when running examples:

```bash
# Install required dependencies
yarn add -D @types/node typescript ts-node

# Or use npx to run without installation
npx ts-node examples/basic-sns.ts
```

## Additional Resources

- [Main README](../README.md) - Package documentation
- [API Reference](../README.md#api-reference) - Detailed API documentation
- [Troubleshooting Guide](../README.md#troubleshooting) - Common issues and solutions

## Contributing

Found an issue with an example or want to add a new one? Please open an issue or pull request on GitHub.
