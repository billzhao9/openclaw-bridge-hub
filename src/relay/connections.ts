import type { WebSocket } from 'ws';
import type { OutgoingMessage } from './types.js';

interface ConnectionEntry {
  ws: WebSocket;
  machineId: string;
  bridgeVersion: string;
  connectedAt: string;
}

const connections = new Map<string, ConnectionEntry>();

export function addConnection(agentId: string, ws: WebSocket, machineId: string, bridgeVersion = ''): void {
  const existing = connections.get(agentId);
  if (existing && existing.ws.readyState === existing.ws.OPEN) {
    existing.ws.close(1000, 'replaced by new connection');
  }
  connections.set(agentId, { ws, machineId, bridgeVersion, connectedAt: new Date().toISOString() });
}

export function removeConnection(agentId: string, ws: WebSocket): void {
  const entry = connections.get(agentId);
  if (entry && entry.ws === ws) {
    connections.delete(agentId);
  }
}

export function getConnection(agentId: string): WebSocket | undefined {
  const entry = connections.get(agentId);
  if (!entry) return undefined;
  if (entry.ws.readyState !== entry.ws.OPEN) {
    connections.delete(agentId);
    return undefined;
  }
  return entry.ws;
}

export function getConnectionMachineId(agentId: string): string | undefined {
  const entry = connections.get(agentId);
  if (!entry) return undefined;
  if (entry.ws.readyState !== entry.ws.OPEN) {
    connections.delete(agentId);
    return undefined;
  }
  return entry.machineId;
}

export function isConnected(agentId: string): boolean {
  return getConnection(agentId) !== undefined;
}

export function sendTo(agentId: string, msg: OutgoingMessage): boolean {
  const ws = getConnection(agentId);
  if (!ws) return false;
  ws.send(JSON.stringify(msg));
  return true;
}

export function getConnectedAgentIds(): string[] {
  return [...connections.keys()].filter(id => isConnected(id));
}

export function getConnectionDetails(): Array<{ agentId: string; machineId: string; bridgeVersion: string; connectedAt: string; readyState: number }> {
  const result: Array<{ agentId: string; machineId: string; bridgeVersion: string; connectedAt: string; readyState: number }> = [];
  for (const [agentId, entry] of connections) {
    result.push({ agentId, machineId: entry.machineId, bridgeVersion: entry.bridgeVersion, connectedAt: entry.connectedAt, readyState: entry.ws.readyState });
  }
  return result;
}

export function closeAndRemoveByAgentId(agentId: string): boolean {
  const entry = connections.get(agentId);
  if (!entry) return false;
  try {
    if (entry.ws.readyState === entry.ws.OPEN || entry.ws.readyState === entry.ws.CONNECTING) {
      entry.ws.close(1000, 'stale cleanup');
    }
  } catch {}
  connections.delete(agentId);
  return true;
}

export function clearAll(): void {
  connections.clear();
}
