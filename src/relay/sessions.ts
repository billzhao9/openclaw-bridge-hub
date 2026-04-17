import { v4 as uuidv4 } from 'uuid';
import type { HandoffSession } from './types.js';

const sessions = new Map<string, HandoffSession>();

export function createSession(originAgent: string, targetAgent: string, reason: string): HandoffSession {
  const session: HandoffSession = {
    sessionId: `sess_${uuidv4().slice(0, 8)}`,
    originAgent,
    proxyAgent: originAgent,
    currentAgent: targetAgent,
    history: [`${originAgent}→${targetAgent}`],
    startedAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
  };
  sessions.set(session.sessionId, session);
  return session;
}

export function getSession(sessionId: string): HandoffSession | undefined {
  return sessions.get(sessionId);
}

export function getSessionByProxy(proxyAgentId: string): HandoffSession | undefined {
  for (const session of sessions.values()) {
    if (session.proxyAgent === proxyAgentId) return session;
  }
  return undefined;
}

export function getSessionByCurrentAgent(agentId: string): HandoffSession | undefined {
  for (const session of sessions.values()) {
    if (session.currentAgent === agentId) return session;
  }
  return undefined;
}

export function switchAgent(sessionId: string, newAgent: string): HandoffSession | undefined {
  const session = sessions.get(sessionId);
  if (!session) return undefined;

  const oldAgent = session.currentAgent;
  session.history.push(`${oldAgent}→${newAgent}`);
  session.currentAgent = newAgent;
  session.lastActivityAt = new Date().toISOString();
  return session;
}

export function endSession(sessionId: string): HandoffSession | undefined {
  const session = sessions.get(sessionId);
  if (!session) return undefined;
  sessions.delete(sessionId);
  return session;
}

export function touchSession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) session.lastActivityAt = new Date().toISOString();
}

export function getExpiredSessions(timeoutMs: number): HandoffSession[] {
  const now = Date.now();
  const expired: HandoffSession[] = [];
  for (const session of sessions.values()) {
    if (now - new Date(session.lastActivityAt).getTime() > timeoutMs) {
      expired.push(session);
    }
  }
  return expired;
}

export function removeSessionsByAgent(agentId: string): HandoffSession[] {
  const removed: HandoffSession[] = [];
  for (const [id, session] of sessions.entries()) {
    if (session.currentAgent === agentId || session.proxyAgent === agentId) {
      sessions.delete(id);
      removed.push(session);
    }
  }
  return removed;
}

export function clearAllSessions(): void {
  sessions.clear();
}
