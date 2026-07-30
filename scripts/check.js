import 'dotenv/config';
import { dynamoClient } from '../src/dynamo.js';
import { ScanCommand } from '@aws-sdk/client-dynamodb';

const { Items } = await dynamoClient.send(new ScanCommand({ TableName: 'fulfillments' }));

if (!Items || Items.length === 0) {
  console.log('No fulfillment records found.');
} else {
  console.log(`${Items.length} fulfillment record(s):\n`);
  for (const item of Items) {
    console.log({
      orderId:     item.orderId.S,
      customerId:  item.customerId.S,
      amountCents: item.amountCents.N,
      status:      item.status.S,
      createdAt:   item.createdAt.S,
    });
  }
}
