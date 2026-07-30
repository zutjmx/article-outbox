import 'dotenv/config';
import { SQSClient } from '@aws-sdk/client-sqs';

export const sqsClient = new SQSClient({
  region:   process.env.AWS_REGION   || 'us-east-1',
  endpoint: process.env.AWS_ENDPOINT_URL,
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID     || 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
  },
});

export const QUEUE_URL = process.env.SQS_QUEUE_URL;
