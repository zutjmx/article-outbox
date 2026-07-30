import 'dotenv/config';
import express from 'express';
import { pool } from './db.js';

const app = express();
app.use(express.json());

app.post('/orders', async (req, res, next) => {
  const { customerId, amountCents } = req.body;

  if (!customerId || !amountCents) {
    return res.status(400).json({ error: 'customerId and amountCents are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO orders (customer_id, amount_cents)
       VALUES ($1, $2)
       RETURNING *`,
      [customerId, amountCents],
    );
    const order = rows[0];

    await client.query(
      `INSERT INTO outbox (event_type, payload)
       VALUES ($1, $2)`,
      ['order.created', JSON.stringify({ orderId: order.id, customerId: order.customer_id, amountCents: order.amount_cents, createdAt: order.created_at })],
    );

    await client.query('COMMIT');
    res.status(201).json(order);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Order service listening on port ${port}`));
