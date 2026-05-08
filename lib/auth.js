// lib/auth.js
import { SignJWT, jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'
);

const COOKIE_NAME = 'admin_session';

export async function createToken(user) {
  const token = await new SignJWT({ id: user.id, username: user.username })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .setIssuedAt()
    .sign(SECRET);

  return token;
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload;
  } catch {
    return null;
  }
}

export function getSessionCookie() {
  return COOKIE_NAME;
}
