import 'dotenv/config';
import { RDSClient, CreateDBInstanceCommand, DescribeDBInstancesCommand } from '@aws-sdk/client-rds';
import { SQSClient, CreateQueueCommand } from '@aws-sdk/client-sqs';
import { DynamoDBClient, CreateTableCommand } from '@aws-sdk/client-dynamodb';
import { writeFileSync } from 'fs';

const awsConfig = {
  region:   process.env.AWS_REGION   || 'us-east-1',
  endpoint: process.env.AWS_ENDPOINT_URL || 'http://localhost:4566',
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID     || 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
  },
};

const rds    = new RDSClient(awsConfig);
const sqs    = new SQSClient(awsConfig);
const dynamo = new DynamoDBClient(awsConfig);

async function waitForRDS(identifier) {
  process.stdout.write('Waiting for RDS instance');
  while (true) {
    const { DBInstances } = await rds.send(
      new DescribeDBInstancesCommand({ DBInstanceIdentifier: identifier }),
    );
    const instance = DBInstances[0];
    if (instance.DBInstanceStatus === 'available') {
      process.stdout.write(' ready.\n');
      return instance.Endpoint;
    }
    process.stdout.write('.');
    await new Promise(r => setTimeout(r, 2000));
  }
}

async function setup() {
  // RDS
  console.log('Creating RDS PostgreSQL instance...');
  try {
    await rds.send(new CreateDBInstanceCommand({
      DBInstanceIdentifier: 'outbox-db',
      DBInstanceClass:      'db.t3.micro',
      Engine:               'postgres',
      MasterUsername:       'postgres',
      MasterUserPassword:   'postgres',
      AllocatedStorage:     20,
    }));
  } catch (err) {
    if (err.name !== 'DBInstanceAlreadyExists') throw err;
    console.log('RDS instance already exists, skipping creation.');
  }

  const endpoint = await waitForRDS('outbox-db');
  console.log(`RDS endpoint: ${endpoint.Address}:${endpoint.Port}`);

  // SQS
  console.log('Creating SQS queue...');
  const { QueueUrl } = await sqs.send(new CreateQueueCommand({ QueueName: 'orders' }));
  console.log(`SQS queue: ${QueueUrl}`);

  // DynamoDB
  console.log('Creating DynamoDB table...');
  try {
    await dynamo.send(new CreateTableCommand({
      TableName: 'fulfillments',
      AttributeDefinitions: [{ AttributeName: 'orderId', AttributeType: 'S' }],
      KeySchema:            [{ AttributeName: 'orderId', KeyType: 'HASH' }],
      BillingMode:          'PAY_PER_REQUEST',
    }));
    console.log('DynamoDB table created.');
  } catch (err) {
    if (err.name !== 'ResourceInUseException') throw err;
    console.log('DynamoDB table already exists, skipping.');
  }

  // Write .env
  const env = [
    `PG_HOST=localhost`,
    `PG_PORT=${endpoint.Port}`,
    `PG_USER=postgres`,
    `PG_PASSWORD=postgres`,
    `PG_DATABASE=postgres`,
    `AWS_ENDPOINT_URL=${awsConfig.endpoint}`,
    `AWS_REGION=${awsConfig.region}`,
    `AWS_ACCESS_KEY_ID=${awsConfig.credentials.accessKeyId}`,
    `AWS_SECRET_ACCESS_KEY=${awsConfig.credentials.secretAccessKey}`,
    `SQS_QUEUE_URL=${QueueUrl}`,
    `PORT=3000`,
  ].join('\n') + '\n';

  writeFileSync('.env', env);
  console.log('.env written. Run `npm run migrate` to create the database tables.');
}

setup().catch(err => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
