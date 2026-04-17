import { randomBytes } from 'crypto';
import { config } from '../config.js';

const sessions = new Map<string, { user: string; expires: number }>();
const SESSION_TTL = 24 * 60 * 60 * 1000;

export function createSession(user: string): string {
  const token = randomBytes(32).toString('hex');
  sessions.set(token, { user, expires: Date.now() + SESSION_TTL });
  return token;
}

export function validateSession(token: string): boolean {
  const session = sessions.get(token);
  if (!session) return false;
  if (Date.now() > session.expires) { sessions.delete(token); return false; }
  return true;
}

export function deleteSession(token: string): void { sessions.delete(token); }

export function login(user: string, pass: string): string | null {
  if (!config.managerPass) return null;
  if (user === config.managerUser && pass === config.managerPass) return createSession(user);
  return null;
}

export function requireAuth(request: any, reply: any): boolean {
  const cookie = request.headers.cookie || '';
  const match = cookie.match(/manager_session=([a-f0-9]+)/);
  if (match && validateSession(match[1])) return true;
  reply.code(401).send({ error: 'Unauthorized' });
  return false;
}
