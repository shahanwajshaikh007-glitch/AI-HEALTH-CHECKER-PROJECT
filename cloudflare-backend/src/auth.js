/**
 * Authentication utilities and middleware for Cloudflare Workers.
 * Uses Web Crypto API for JWT signing/verifying and bcryptjs for password hashing.
 */

import bcrypt from 'bcryptjs';

// Base64URL encoding/decoding
function base64UrlEncode(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return atob(str);
}

// Convert string to Uint8Array
function strToBuf(str) {
  return new TextEncoder().encode(str);
}

// Get HMAC key
async function getHmacKey(secret) {
  return await crypto.subtle.importKey(
    'raw',
    strToBuf(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function createToken(payload, secret, expiresInSeconds = 86400 * 7) {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds
  };

  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const data = `${encodedHeader}.${encodedPayload}`;

  const key = await getHmacKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, strToBuf(data));

  const encodedSignature = base64UrlEncode(
    String.fromCharCode(...new Uint8Array(signature))
  );

  return `${data}.${encodedSignature}`;
}

export async function verifyToken(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const data = `${encodedHeader}.${encodedPayload}`;

    const key = await getHmacKey(secret);
    const signatureBytes = Uint8Array.from(base64UrlDecode(encodedSignature), c => c.charCodeAt(0));

    const isValid = await crypto.subtle.verify('HMAC', key, signatureBytes, strToBuf(data));
    if (!isValid) return null;

    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    return payload;
  } catch (e) {
    return null;
  }
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function userToDict(user) {
  return {
    id: user.id,
    full_name: user.full_name || user.name || '',
    name: user.full_name || user.name || '',
    email: user.email,
    role: user.role || 'user',
    age: user.age,
    gender: user.gender,
    phone: user.phone,
    language: user.language || 'en',
    created_at: user.created_at,
    updated_at: user.updated_at
  };
}

export async function authMiddleware(c, next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ detail: 'Could not validate credentials' }, 401);
  }

  const token = authHeader.substring(7).trim();
  const secret = c.env.JWT_SECRET;
  if (!secret) {
    return c.json({ detail: 'Server authentication misconfiguration: JWT_SECRET not configured.' }, 500);
  }
  const payload = await verifyToken(token, secret);

  if (!payload || !payload.sub) {
    return c.json({ detail: 'Could not validate credentials' }, 401);
  }

  // Look up user in Cloudflare D1
  const db = c.env.DB;
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(payload.sub).first();

  if (!user) {
    return c.json({ detail: 'Could not validate credentials' }, 401);
  }

  c.set('user', user);
  await next();
}

export async function adminMiddleware(c, next) {
  const user = c.get('user');
  if (!user || user.role !== 'admin') {
    return c.json({ detail: 'Admin privileges required.' }, 403);
  }
  await next();
}
