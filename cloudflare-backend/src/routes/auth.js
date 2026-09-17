/**
 * Authentication routes for Cloudflare Workers & D1.
 */
import { Hono } from 'hono';
import { hashPassword, comparePassword, createToken, userToDict } from '../auth.js';

const auth = new Hono();

// Helper to generate unique ID
function generateId(prefix = 'usr') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

// POST /api/auth/register
auth.post('/register', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) {
    return c.json({ detail: 'Invalid request body.' }, 400);
  }

  const { full_name, email, password, confirm_password, age, gender, phone, language } = body;

  if (!full_name || !full_name.trim()) {
    return c.json({ detail: 'Full name cannot be empty.' }, 400);
  }
  if (!email || !email.includes('@')) {
    return c.json({ detail: 'A valid email is required.' }, 400);
  }
  if (!password || password.length < 8) {
    return c.json({ detail: 'Password must be at least 8 characters.' }, 400);
  }
  if (confirm_password && password !== confirm_password) {
    return c.json({ detail: 'Passwords do not match.' }, 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const db = c.env.DB;

  // Check existing user
  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind(normalizedEmail).first();
  if (existing) {
    return c.json({ detail: 'An account with this email already exists.' }, 409);
  }

  const passwordHash = await hashPassword(password);
  const userId = generateId('usr');
  const now = new Date().toISOString();

  await db.prepare(`
    INSERT INTO users (id, full_name, name, email, password_hash, role, age, gender, phone, language, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    userId,
    full_name.trim(),
    full_name.trim(),
    normalizedEmail,
    passwordHash,
    'user',
    age ? parseInt(age, 10) : null,
    gender || null,
    phone || null,
    language || 'en',
    now,
    now
  ).run();

  const user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
  const secret = c.env.JWT_SECRET;
  if (!secret) {
    return c.json({ detail: 'Server authentication misconfiguration: JWT_SECRET missing.' }, 500);
  }
  const token = await createToken({ sub: userId, email: normalizedEmail, role: 'user' }, secret);

  return c.json({
    access_token: token,
    token_type: 'bearer',
    user: userToDict(user)
  }, 201);
});

// POST /api/auth/login
auth.post('/login', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || !body.email || !body.password) {
    return c.json({ detail: 'Email and password are required.' }, 400);
  }

  const normalizedEmail = body.email.trim().toLowerCase();
  const db = c.env.DB;

  const user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(normalizedEmail).first();
  if (!user) {
    return c.json({ detail: 'Incorrect email or password.' }, 401);
  }

  const valid = await comparePassword(body.password, user.password_hash);
  if (!valid) {
    return c.json({ detail: 'Incorrect email or password.' }, 401);
  }

  const secret = c.env.JWT_SECRET;
  if (!secret) {
    return c.json({ detail: 'Server authentication misconfiguration: JWT_SECRET missing.' }, 500);
  }
  const token = await createToken({ sub: user.id, email: user.email, role: user.role || 'user' }, secret);

  return c.json({
    access_token: token,
    token_type: 'bearer',
    user: userToDict(user)
  });
});

export default auth;
