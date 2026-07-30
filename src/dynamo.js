import 'dotenv/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

export const dynamoClient = new DynamoDBClient({
  region:   process.env.AWS_REGION   || 'us-east-1',
  endpoint: process.env.AWS_ENDPOINT_URL,
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID     || 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
  },
});
