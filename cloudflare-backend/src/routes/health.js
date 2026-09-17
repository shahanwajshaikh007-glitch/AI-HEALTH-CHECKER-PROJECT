/**
 * Health check routes for Cloudflare Workers.
 */
import { Hono } from 'hono';

const health = new Hono();

health.get('/health', async (c) => {
  let dbStatus = 'disconnected';
  try {
    const result = await c.env.DB.prepare('SELECT 1 as ok').first();
    if (result && result.ok === 1) {
      dbStatus = 'connected';
    }
  } catch (e) {
    dbStatus = 'error';
  }

  return c.json({
    status: dbStatus === 'connected' ? 'healthy' : 'degraded',
    service: 'AI Medical Symptom Assistant API',
    version: '1.0.0',
    runtime: 'Cloudflare Workers (Edge)',
    database: dbStatus,
    database_type: 'Cloudflare D1 (Serverless SQL)',
    timestamp: new Date().toISOString()
  });
});

health.get('/ping', (c) => {
  return c.json({
    ping: 'pong',
    timestamp: new Date().toISOString()
  });
});

export default health;
