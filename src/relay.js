import { pool } from './db.js';
import { sqsClient, QUEUE_URL } from './sqs.js';
import { SendMessageCommand } from '@aws-sdk/client-sqs';

async function relay() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(`
      SELECT *
      FROM outbox
      WHERE status = 'pending'
      ORDER BY created_at
      LIMIT 10
      FOR UPDATE SKIP LOCKED
    `);

    for (const row of rows) {
      await sqsClient.send(new SendMessageCommand({
        QueueUrl: QUEUE_URL,
        MessageBody: JSON.stringify(row.payload),
        MessageAttributes: {
          EventType: { DataType: 'String', StringValue: row.event_type },
        },
      }));

      await client.query(
        `UPDATE outbox SET status = 'sent', sent_at = now() WHERE id = $1`,
        [row.id],
      );
    }

    await client.query('COMMIT');

    if (rows.length > 0) {
      console.log(`Relayed ${rows.length} message(s).`);
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Relay error:', err.message);
  } finally {
    client.release();
  }
}

setInterval(relay, 1000);
console.log('Relay worker started.');
