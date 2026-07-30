import { pool } from './db.js';

await pool.query(`
  CREATE TABLE IF NOT EXISTS orders (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id TEXT        NOT NULL,
    amount_cents INTEGER     NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now()
  )
`);

await pool.query(`
  CREATE TABLE IF NOT EXISTS outbox (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type  TEXT        NOT NULL,
    payload     JSONB       NOT NULL,
    status      TEXT        NOT NULL DEFAULT 'pending',
    created_at  TIMESTAMPTZ DEFAULT now(),
    sent_at     TIMESTAMPTZ
  )
`);

await pool.query(`
  CREATE INDEX IF NOT EXISTS outbox_pending_idx
    ON outbox (created_at)
    WHERE status = 'pending'
`);

console.log('Migration complete.');
await pool.end();
