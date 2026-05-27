// src/app.js
// Main Express app. Mount this in your NestJS or Express root.

require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const Redis = require('ioredis');
const aiRoutes = require('./routes/ai.routes');

const app = express();
app.use(express.json());

// PostgreSQL connection pool
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
});

// Redis client
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Share clients across routes via app.locals
app.locals.db = {
  query: (sql, params) => db.query(sql, params).then(r => r.rows),
};
app.locals.redis = redis;

// Mount routes
app.use('/api/v1/ai', aiRoutes);

// Health check (unauthenticated — for load balancer / Docker healthcheck)
app.get('/health', (_, res) => res.json({ status: 'ok', ts: Date.now() }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`[ISP AI service] listening on :${PORT}`));

module.exports = app;
