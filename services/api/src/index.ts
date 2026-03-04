import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { createRouter } from './routes';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error';
import { getMetrics, metricsMiddleware, metricsHandler } from './observability';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const metrics = getMetrics();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  max: 20,
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || '*',
}));
app.use(express.json());

// Observability – instrument all requests
app.use(metricsMiddleware(metrics));

// Metrics endpoint (public, unauthenticated)
app.get('/metrics', metricsHandler(metrics));

// Health check (public)
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: 'Database connection failed' });
  }
});

// Auth middleware (protects all API routes)
app.use('/api', authMiddleware);

// API routes (pass metrics for per-operation instrumentation)
app.use('/api', createRouter(pool, metrics));

// Error handling
app.use(errorHandler);

// Start server
app.listen(port, () => {
  console.log(`🚀 LedgerMind API running on port ${port}`);
  console.log(`   Environment: ${process.env.NODE_ENV}`);
  console.log(`   Health: http://localhost:${port}/health`);
  console.log(`   Metrics: http://localhost:${port}/metrics`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await pool.end();
  process.exit(0);
});
