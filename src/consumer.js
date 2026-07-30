import { sqsClient, QUEUE_URL } from './sqs.js';
import { dynamoClient } from './dynamo.js';
import { ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { PutItemCommand } from '@aws-sdk/client-dynamodb';

async function consume() {
  const { Messages } = await sqsClient.send(new ReceiveMessageCommand({
    QueueUrl:              QUEUE_URL,
    WaitTimeSeconds:       20,
    MaxNumberOfMessages:   10,
    MessageAttributeNames: ['All'],
  }));

  for (const msg of Messages ?? []) {
    const event = JSON.parse(msg.Body);
    console.log(`Processing event: orderId=${event.orderId}`);

    try {
      await dynamoClient.send(new PutItemCommand({
        TableName: 'fulfillments',
        Item: {
          orderId:     { S: event.orderId },
          customerId:  { S: event.customerId },
          amountCents: { N: String(event.amountCents) },
          status:      { S: 'received' },
          createdAt:   { S: new Date().toISOString() },
        },
        ConditionExpression: 'attribute_not_exists(orderId)',
      }));

      console.log(`Fulfillment created for order ${event.orderId}`);
    } catch (err) {
      if (err.name !== 'ConditionalCheckFailedException') throw err;
      console.log(`Order ${event.orderId} already fulfilled, skipping.`);
    }

    await sqsClient.send(new DeleteMessageCommand({
      QueueUrl:      QUEUE_URL,
      ReceiptHandle: msg.ReceiptHandle,
    }));
  }
}

async function loop() {
  while (true) {
    try {
      await consume();
    } catch (err) {
      console.error('Consumer error:', err.message);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

console.log('Fulfillment consumer started.');
loop();
