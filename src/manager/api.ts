import type { FastifyInstance } from 'fastify';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { login, deleteSession, requireAuth } from './auth.js';
import { getAllManagerStatuses, sendCommandToManager, getAgentLogs } from './ws-manager.js';
import { sendChatMessage } from './chat.js';
import { getConnectedAgentIds } from '../relay/connections.js';
import { db } from '../db.js';
import { config } from '../config.js';

export function registerManagerApi(app: FastifyInstance): void {
  app.post('/api/login', async (request, reply) => {
    const { user, pass } = request.body as { user: string; pass: string };
    const token = login(user, pass);
    if (!token) { reply.code(401).send({ error: 'Invalid credentials' }); return; }
    reply.header('Set-Cookie', 'manager_session=' + token + '; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400');
    return { status: 'ok' };
  });

  app.post('/api/logout', async (request, reply) => {
    const cookie = request.headers.cookie || '';
    const match = cookie.match(/manager_session=([a-f0-9]+)/);
    if (match) deleteSession(match[1]);
    reply.header('Set-Cookie', 'manager_session=; Path=/; Max-Age=0');
    return { status: 'ok' };
  });

  app.get('/api/dashboard', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const rows = db.prepare('SELECT agentId, data, channels, lastHeartbeat FROM registry ORDER BY agentId').all() as any[];
    const agents = rows.map(r => ({
      ...JSON.parse(r.data),
      channels: JSON.parse(r.channels || '[]'),
      lastHeartbeat: r.lastHeartbeat,
    }));
    const hubConnected = getConnectedAgentIds();
    const managerStatuses = getAllManagerStatuses();
    return { agents, hubConnected, managerStatuses };
  });

  app.post('/api/control', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const { machineId, action, target } = request.body as { machineId: string; action: string; target: string };
    const sent = sendCommandToManager(machineId, action, target);
    if (!sent) { reply.code(502).send({ error: 'Machine ' + machineId + ' is not connected' }); return; }
    return { status: 'sent', machineId, action, target };
  });

  app.post('/api/chat', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const { agentId, message, image } = request.body as { agentId: string; message: string; image?: string };

    // Look up supportsVision from registry
    let supportsVision = false;
    const row = db.prepare('SELECT data FROM registry WHERE agentId = ?').get(agentId) as { data: string } | undefined;
    if (row) {
      try {
        const agentData = JSON.parse(row.data);
        supportsVision = !!agentData.supportsVision;
      } catch {}
    }

    // If image present, save to workspace via file relay
    if (image) {
      const base64 = image.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(base64, 'base64');
      const chatImagesDir = join(config.dataDir, 'chat-images');
      mkdirSync(chatImagesDir, { recursive: true });
      const diskFilename = uuidv4().slice(0, 8) + '-image.png';
      writeFileSync(join(chatImagesDir, diskFilename), buffer);

      db.prepare(
        `INSERT INTO files (id, fromAgent, toAgent, filename, diskPath, size, metadata, status, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      ).run(
        uuidv4(), 'hub-manager', agentId, 'hub/' + diskFilename,
        join(chatImagesDir, diskFilename), buffer.length,
        JSON.stringify({ source: 'hub-chat' }), new Date().toISOString(),
      );
    }

    const response = await sendChatMessage(agentId, message, image, supportsVision);
    return { agentId, response };
  });

  app.get('/api/logs/:agentId', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const { agentId } = request.params as { agentId: string };
    const logs = getAgentLogs(agentId);
    if (logs === undefined) {
      return { error: 'No logs available for ' + agentId + '. Is the Local Manager running?' };
    }
    return { agentId, logs };
  });
}
