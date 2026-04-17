import type { FastifyInstance } from 'fastify';
import websocket from '@fastify/websocket';
import { addConnection, removeConnection, sendTo, getConnectionMachineId } from './connections.js';
import { removeSessionsByAgent, getExpiredSessions, endSession } from './sessions.js';
import { dispatch } from './handlers/dispatch.js';
import type { IncomingMessage, AuthMessage } from './types.js';
import { logConnectionEvent } from '../routes/debug.js';
import { db } from '../db.js';

const SESSION_TIMEOUT_MS = 600_000; // 10 minutes idle

export async function registerWebSocket(app: FastifyInstance, apiKey: string) {
  await app.register(websocket);

  app.get('/ws', { websocket: true }, (socket, req) => {
    let agentId: string | null = null;
    let pingInterval: ReturnType<typeof setInterval> | null = null;

    const authTimeout = setTimeout(() => {
      if (!agentId) {
        socket.send(JSON.stringify({ type: 'auth_error', reason: 'auth timeout' }));
        socket.close(4001, 'auth timeout');
      }
    }, 10_000);

    socket.on('message', (data) => {
      let msg: IncomingMessage;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        socket.send(JSON.stringify({ type: 'error', code: 'INVALID_JSON', message: 'Invalid JSON' }));
        return;
      }

      if (msg.type === 'auth') {
        clearTimeout(authTimeout);
        const authMsg = msg as AuthMessage;

        if (authMsg.apiKey !== apiKey) {
          socket.send(JSON.stringify({ type: 'auth_error', reason: 'invalid api key' }));
          socket.close(4003, 'invalid api key');
          return;
        }

        const incomingMachineId = authMsg.machineId || '';
        const existingMachineId = getConnectionMachineId(authMsg.agentId);

        // Conflict detection: if agentId is already connected from a DIFFERENT machine, reject
        // Same machine (same machineId, both non-empty) = normal reconnection, allow replacement
        // Different machine OR either side unknown = conflict, force rename
        if (existingMachineId !== undefined) {
          const sameMachine = incomingMachineId && existingMachineId && incomingMachineId === existingMachineId;
          if (!sameMachine) {
            const label = incomingMachineId || 'unknown';
            const suggestedId = incomingMachineId
              ? `${authMsg.agentId}@${incomingMachineId}`
              : `${authMsg.agentId}@${Date.now().toString(36)}`;
            app.log.info(`[relay] CONFLICT: "${authMsg.agentId}" occupied by "${existingMachineId || 'unknown'}", suggesting "${suggestedId}" to "${label}"`);
            logConnectionEvent('conflict', authMsg.agentId, label, `occupied by ${existingMachineId || 'unknown'}, suggested ${suggestedId}`);
            socket.send(JSON.stringify({
              type: 'auth_conflict',
              existingMachine: existingMachineId || 'unknown',
              suggestedId,
            }));
            socket.close(4009, 'agentId conflict');
            return;
          }
        }

        agentId = authMsg.agentId;
        const bridgeVersion = authMsg.bridgeVersion || '';
        addConnection(agentId, socket, incomingMachineId, bridgeVersion);
        socket.send(JSON.stringify({ type: 'auth_ok' }));
        app.log.info(`[relay] Agent ${agentId} connected (machine: ${incomingMachineId || 'unknown'}, bridge: v${bridgeVersion || '?'})`);
        logConnectionEvent('connected', agentId, incomingMachineId, bridgeVersion ? `bridge v${bridgeVersion}` : '');

        // Start ping/pong heartbeat for this connection
        let lastPong = Date.now();
        socket.on('pong', () => { lastPong = Date.now(); });

        pingInterval = setInterval(() => {
          if (Date.now() - lastPong > 40_000) {
            app.log.info(`[relay] Agent ${agentId} ping timeout, closing`);
            clearInterval(pingInterval!);
            pingInterval = null;
            socket.close(1001, 'ping timeout');
            return;
          }
          if (socket.readyState === socket.OPEN) {
            socket.ping();
          }
        }, 30_000);
        return;
      }

      if (!agentId) {
        socket.send(JSON.stringify({ type: 'auth_error', reason: 'not authenticated' }));
        return;
      }

      dispatch(msg, agentId);
    });

    socket.on('close', () => {
      if (pingInterval) { clearInterval(pingInterval); pingInterval = null; }
      clearTimeout(authTimeout);
      if (agentId) {
        app.log.info(`[relay] Agent ${agentId} disconnected`);
        logConnectionEvent('disconnected', agentId, '');
        removeConnection(agentId, socket);

        // Mark agent as offline in registry so dashboard shows correct state
        try {
          const row = db.prepare('SELECT data FROM registry WHERE agentId = ?').get(agentId) as { data: string } | undefined;
          if (row) {
            const data = JSON.parse(row.data);
            data.status = 'offline';
            db.prepare('UPDATE registry SET data = ? WHERE agentId = ?').run(JSON.stringify(data), agentId);
          }
        } catch { /* best-effort */ }

        const removed = removeSessionsByAgent(agentId);
        for (const session of removed) {
          const other = session.proxyAgent === agentId
            ? session.currentAgent
            : session.proxyAgent;
          sendTo(other, {
            type: 'error',
            code: 'AGENT_DISCONNECTED',
            message: `${agentId} disconnected, session ended`,
          });
        }
      }
    });

    socket.on('error', (err) => {
      app.log.error(`[relay] WebSocket error for ${agentId || 'unauthenticated'}: ${err.message}`);
    });
  });

  // Session timeout cleanup (every 60 seconds)
  const cleanupInterval = setInterval(() => {
    const expired = getExpiredSessions(SESSION_TIMEOUT_MS);
    for (const session of expired) {
      endSession(session.sessionId);
      sendTo(session.proxyAgent, { type: 'handoff_end', sessionId: session.sessionId });
      sendTo(session.currentAgent, { type: 'handoff_end', sessionId: session.sessionId });
      app.log.info(`[relay] Session ${session.sessionId} expired (idle timeout)`);
    }
  }, 60_000);

  app.addHook('onClose', () => {
    clearInterval(cleanupInterval);
  });
}
