/**
 * Main Cloudflare Worker Entrypoint.
 * Framework: Hono
 * Runtime: Cloudflare Workers
 * Database: Cloudflare D1
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';

import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import profileRouter from './routes/profile.js';
import symptomsRouter from './routes/symptoms.js';
import predictionRouter from './routes/prediction.js';
import chatRouter from './routes/chat.js';
import reportsRouter from './routes/reports.js';
import adminRouter from './routes/admin.js';

const app = new Hono();

// Global CORS Middleware
app.use('*', cors({
  origin: (origin) => {
    if (!origin) return null;
    if (origin === 'http://localhost:5173' || origin === 'http://127.0.0.1:5173') {
      return origin;
    }
    try {
      const parsed = new URL(origin);
      if (parsed.hostname.endsWith('.pages.dev')) {
        return origin;
      }
    } catch (e) {
      // Ignore invalid URL format
    }
    return null;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Disposition'],
  credentials: true,
  maxAge: 86400
}));

// Root Route
app.get('/', (c) => {
  return c.json({
    message: 'Welcome to AI Medical Symptom Assistant API',
    runtime: 'Cloudflare Workers (Edge)',
    database: 'Cloudflare D1 (Serverless SQL)',
    docs: '/api/health',
    status: 'running'
  });
});

// Mount Routers
app.route('/api', healthRouter);
app.route('/api/auth', authRouter);
app.route('/api/profile', profileRouter);
app.route('/api/symptoms', symptomsRouter);
app.route('/api/prediction', predictionRouter);
app.route('/api/chat', chatRouter);
app.route('/api/reports', reportsRouter);
app.route('/api/admin', adminRouter);

// Global Not Found Handler
app.notFound((c) => {
  return c.json({ detail: 'Endpoint not found.' }, 404);
});

// Global Error Handler
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json({
    detail: err.message || 'Internal Server Error'
  }, 500);
});

export default app;
