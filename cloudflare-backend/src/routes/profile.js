/**
 * Profile routes for Cloudflare Workers & D1.
 */
import { Hono } from 'hono';
import { authMiddleware, userToDict } from '../auth.js';

const profile = new Hono();

profile.use('*', authMiddleware);

// GET /api/profile
profile.get('/', async (c) => {
  const user = c.get('user');
  return c.json(userToDict(user));
});

// PUT /api/profile
profile.put('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const db = c.env.DB;

  let fullName = user.full_name;
  if (body.full_name !== undefined) {
    if (!body.full_name || !body.full_name.trim()) {
      return c.json({ detail: 'Name cannot be empty' }, 400);
    }
    fullName = body.full_name.trim();
  }

  let age = user.age;
  if (body.age !== undefined && body.age !== null) {
    const parsedAge = parseInt(body.age, 10);
    if (isNaN(parsedAge) || parsedAge < 1 || parsedAge > 120) {
      return c.json({ detail: 'Invalid age' }, 400);
    }
    age = parsedAge;
  }

  const gender = body.gender !== undefined ? body.gender : user.gender;
  const phone = body.phone !== undefined ? body.phone : user.phone;
  const language = body.language !== undefined ? body.language : user.language;
  const now = new Date().toISOString();

  await db.prepare(`
    UPDATE users
    SET full_name = ?, name = ?, age = ?, gender = ?, phone = ?, language = ?, updated_at = ?
    WHERE id = ?
  `).bind(fullName, fullName, age, gender, phone, language, now, user.id).run();

  const updatedUser = await db.prepare('SELECT * FROM users WHERE id = ?').bind(user.id).first();

  return c.json({
    message: 'Profile updated successfully.',
    user: userToDict(updatedUser)
  });
});

export default profile;
