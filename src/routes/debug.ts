import type { FastifyInstance } from "fastify";
import { getConnectionDetails, addConnection, getConnectionMachineId } from "../relay/connections.js";
import { getAllManagerStatuses } from "../manager/ws-manager.js";
import { db } from "../db.js";

// Ring buffer for connection events (last 100)
interface ConnectionEvent {
  timestamp: string;
  event: string;
  agentId: string;
  machineId: string;
  detail?: string;
}

const eventLog: ConnectionEvent[] = [];
const MAX_EVENTS = 100;

export function logConnectionEvent(event: string, agentId: string, machineId: string, detail?: string): void {
  eventLog.push({
    timestamp: new Date().toISOString(),
    event,
    agentId,
    machineId,
    detail,
  });
  if (eventLog.length > MAX_EVENTS) eventLog.shift();
}

export function registerDebugRoutes(app: FastifyInstance): void {
  // GET /api/v1/debug/connections — show all active WebSocket connections
  app.get("/api/v1/debug/connections", async () => {
    const connections = getConnectionDetails();
    const stateMap: Record<number, string> = { 0: "CONNECTING", 1: "OPEN", 2: "CLOSING", 3: "CLOSED" };
    return {
      count: connections.length,
      connections: connections.map(c => ({
        ...c,
        state: stateMap[c.readyState] || "UNKNOWN",
      })),
    };
  });

  // GET /api/v1/debug/events — show recent connection events
  app.get("/api/v1/debug/events", async () => {
    return { count: eventLog.length, events: eventLog };
  });

  // GET /api/v1/debug/registry — show all registry entries with connection status
  app.get("/api/v1/debug/registry", async () => {
    const rows = db
      .prepare("SELECT agentId, data, lastHeartbeat FROM registry ORDER BY agentId")
      .all() as Array<{ agentId: string; data: string; lastHeartbeat: string }>;

    const connections = getConnectionDetails();
    const connMap = new Map(connections.map(c => [c.agentId, c]));

    return {
      count: rows.length,
      agents: rows.map(r => {
        const data = JSON.parse(r.data);
        const conn = connMap.get(r.agentId);
        return {
          agentId: r.agentId,
          agentName: data.agentName,
          machineId: data.machineId,
          lastHeartbeat: r.lastHeartbeat,
          wsConnected: !!conn,
          wsMachineId: conn?.machineId,
        };
      }),
    };
  });

  // GET /api/v1/debug/managers — show all Local Manager connections
  app.get("/api/v1/debug/managers", async () => {
    return { managers: getAllManagerStatuses() };
  });

  // POST /api/v1/debug/simulate-conflict — create a fake agent to test conflict detection
  // Body: { agentId: "main", machineId: "fake-machine" }
  app.post("/api/v1/debug/simulate-conflict", async (request) => {
    const { agentId, machineId } = request.body as { agentId: string; machineId: string };
    if (!agentId || !machineId) {
      return { error: "agentId and machineId are required" };
    }

    // Check if already occupied
    const existingMachine = getConnectionMachineId(agentId);
    if (existingMachine) {
      return {
        status: "already_occupied",
        agentId,
        existingMachine,
        message: `agentId "${agentId}" is already connected from machine "${existingMachine}"`,
      };
    }

    // Create a fake WebSocket-like placeholder to occupy the slot
    // We use a minimal object that satisfies the connection map
    const fakeWs = {
      readyState: 1, // OPEN
      OPEN: 1,
      close: () => { /* no-op */ },
      send: () => { /* no-op */ },
      ping: () => { /* no-op */ },
      on: () => { /* no-op */ },
    } as any;

    addConnection(agentId, fakeWs, machineId);
    logConnectionEvent("simulate", agentId, machineId, "fake connection created for testing");

    return {
      status: "simulated",
      agentId,
      machineId,
      message: `Fake connection created. Next real client connecting as "${agentId}" from a different machine will get auth_conflict suggesting "${agentId}@<their-machineId>"`,
      cleanup: `DELETE /api/v1/debug/simulate-conflict/${agentId} to remove`,
    };
  });

  // DELETE /api/v1/debug/simulate-conflict/:agentId — remove a simulated connection
  app.delete("/api/v1/debug/simulate-conflict/:agentId", async (request) => {
    const { agentId } = request.params as { agentId: string };
    const conn = getConnectionDetails().find(c => c.agentId === agentId);
    if (!conn) {
      return { error: `No connection found for "${agentId}"` };
    }
    // Remove by getting the fake ws and calling removeConnection
    const { removeConnection } = await import("../relay/connections.js");
    // We need the actual ws object — get it from connections
    const { getConnection } = await import("../relay/connections.js");
    const ws = getConnection(agentId);
    if (ws) {
      removeConnection(agentId, ws);
      logConnectionEvent("simulate_removed", agentId, conn.machineId, "fake connection removed");
    }
    return { status: "removed", agentId };
  });
}
