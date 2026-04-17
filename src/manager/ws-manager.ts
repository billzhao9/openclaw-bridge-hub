import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';
import { config } from '../config.js';

interface ManagerConnection {
  ws: WebSocket;
  machineId: string;
  lastStatus: any;
  lastStatusAt: string;
}

const managers = new Map<string, ManagerConnection>();
const agentLogs = new Map<string, string>();

export function getAgentLogs(agentId: string): string | undefined {
  return agentLogs.get(agentId) ?? agentLogs.get('gw-' + agentId);
}

export function getManagers(): Map<string, ManagerConnection> { return managers; }

export function getAllManagerStatuses(): Array<{ machineId: string; status: any; lastStatusAt: string }> {
  const result: Array<{ machineId: string; status: any; lastStatusAt: string }> = [];
  for (const [machineId, conn] of managers) {
    if (conn.ws.readyState === conn.ws.OPEN) {
      result.push({ machineId, status: conn.lastStatus, lastStatusAt: conn.lastStatusAt });
    }
  }
  return result;
}

export function sendCommandToManager(machineId: string, action: string, target: string): boolean {
  const conn = managers.get(machineId);
  if (!conn || conn.ws.readyState !== conn.ws.OPEN) return false;
  conn.ws.send(JSON.stringify({ type: 'manager_command', action, target }));
  return true;
}

export async function registerManagerWebSocket(app: FastifyInstance) {
  app.get('/ws/manager', { websocket: true }, (socket, req) => {
    let machineId: string | null = null;
    const authTimeout = setTimeout(() => {
      if (!machineId) { socket.send(JSON.stringify({ type: 'auth_error', reason: 'auth timeout' })); socket.close(4001); }
    }, 10_000);

    socket.on('message', (data) => {
      let msg: any;
      try { msg = JSON.parse(data.toString()); } catch { return; }

      if (msg.type === 'auth' && msg.role === 'manager') {
        clearTimeout(authTimeout);
        if (msg.apiKey !== config.apiKey || msg.managerPass !== config.managerPass) {
          socket.send(JSON.stringify({ type: 'auth_error', reason: 'invalid credentials' }));
          socket.close(4003);
          return;
        }
        machineId = msg.machineId;
        managers.set(machineId!, { ws: socket, machineId: machineId!, lastStatus: null, lastStatusAt: '' });
        socket.send(JSON.stringify({ type: 'auth_ok' }));
        app.log.info('[manager] Machine ' + machineId + ' connected');
        return;
      }
      if (!machineId) { socket.send(JSON.stringify({ type: 'auth_error', reason: 'not authenticated' })); return; }
      if (msg.type === 'manager_status') {
        const conn = managers.get(machineId);
        if (conn) { conn.lastStatus = msg; conn.lastStatusAt = new Date().toISOString(); }
        if (msg.logs && typeof msg.logs === 'object') {
          for (const [processName, logText] of Object.entries(msg.logs)) {
            agentLogs.set(processName, logText as string);
            const agentId = processName.replace(/^gw-/, '');
            agentLogs.set(agentId, logText as string);
          }
        }
      }
      if (msg.type === 'manager_result') {
        app.log.info('[manager] ' + machineId + ': ' + msg.action + ' ' + msg.target + ' -> ' + msg.success);
      }
    });

    socket.on('close', () => {
      clearTimeout(authTimeout);
      if (machineId) { managers.delete(machineId); app.log.info('[manager] Machine ' + machineId + ' disconnected'); }
    });
    socket.on('error', (err) => { app.log.error('[manager] WS error: ' + err.message); });
  });
}
