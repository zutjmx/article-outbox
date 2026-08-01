# article-outbox

Companion repo for How to Fix the Dual-Write Problem in Node.js with the Outbox Pattern.

Demonstrates the transactional outbox pattern using:

- **PostgreSQL** (via floci RDS) — order service database
- **SQS** (via floci) — message queue between services
- **DynamoDB** (via floci) — fulfillment service database

## Prerequisites

- Node.js 20+
- Docker

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Start floci

```bash
npm run floci:start
```

This pulls and starts the [floci](https://floci.io) local AWS emulator as a Docker container, exposing port 4566 (the AWS endpoint) and ports 7001-7099 (used by floci to proxy RDS PostgreSQL connections). floci needs access to the Docker socket so it can spin up a real PostgreSQL container for RDS.

On Windows with Docker Desktop, the Docker socket path is different. Edit the `floci:start` script in `package.json` and replace `/var/run/docker.sock` with `//var/run/docker.sock`.

### 3. Provision AWS resources and write .env

```bash
npm run setup
```

This creates the RDS PostgreSQL instance, the SQS `orders` queue, and the DynamoDB `fulfillments` table, then writes a `.env` file with the correct connection details (including the RDS proxy port assigned by floci).

### 4. Create database tables

```bash
npm run migrate
```

### 5. Start the services

Open three terminals:

```bash
# Terminal 1 — order API
npm run server

# Terminal 2 — outbox relay worker
npm run relay

# Terminal 3 — fulfillment consumer
npm run consumer
```

### 6. Place an order

```bash
curl -X POST http://localhost:3000/orders \
  -H 'Content-Type: application/json' \
  -d '{"customerId": "c1", "amountCents": 4999}'
```

### 7. Verify the fulfillment record

```bash
npm run check
```

## Going to production

Remove `AWS_ENDPOINT_URL` from the environment (or point it at your real AWS region endpoint). The application code and AWS SDK calls are unchanged.

## Project structure

```
scripts/
  setup.js       provision floci resources, write .env
src/
  db.js          pg pool
  sqs.js         SQS client
  dynamo.js      DynamoDB client
  migrate.js     create pg tables
  server.js      Express API — POST /orders
  relay.js       outbox relay worker (pg → SQS)
  consumer.js    fulfillment consumer (SQS → DynamoDB)
.env.example
package.json
```
