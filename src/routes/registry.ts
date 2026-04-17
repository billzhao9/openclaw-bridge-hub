import type { FastifyInstance } from "fastify";
import { db } from "../db.js";

export function registerRegistryRoutes(app: FastifyInstance): void {
  // Register or update a gateway entry
  app.post("/api/v1/registry/register", async (request) => {
    const body = request.body as Record<string, unknown>;
    const agentId = body.agentId as string;
    if (!agentId) return { error: "agentId is required" };

    const incomingMachineId = (body.machineId as string) || "";

    // Check for machineId conflict in registry
    if (incomingMachineId) {
      const existing = db.prepare("SELECT data FROM registry WHERE agentId = ?").get(agentId) as { data: string } | undefined;
      if (existing) {
        const existingData = JSON.parse(existing.data);
        const existingMachineId = existingData.machineId || "";
        if (existingMachineId && existingMachineId !== incomingMachineId) {
          return {
            error: "agentId_conflict",
            message: `agentId "${agentId}" is registered to machine "${existingMachineId}", cannot register from "${incomingMachineId}"`,
            existingMachine: existingMachineId,
          };
        }
      }
    }

    const now = new Date().toISOString();
    const data = JSON.stringify(body);
    const channels = JSON.stringify(Array.isArray(body.channels) ? body.channels : []);

    db.prepare(
      `INSERT INTO registry (agentId, data, lastHeartbeat, createdAt, channels)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(agentId) DO UPDATE SET data = ?, lastHeartbeat = ?, channels = ?`,
    ).run(agentId, data, now, now, channels, data, now, channels);

    return { status: "ok", agentId };
  });

  // Heartbeat — update lastHeartbeat and optionally update data
  app.post("/api/v1/registry/heartbeat", async (request) => {
    const body = request.body as Record<string, unknown>;
    const agentId = body.agentId as string;
    if (!agentId) return { error: "agentId is required" };

    // Check for machineId conflict in registry
    const incomingMachineId = (body.machineId as string) || "";
    if (incomingMachineId) {
      const existing = db.prepare("SELECT data FROM registry WHERE agentId = ?").get(agentId) as { data: string } | undefined;
      if (existing) {
        const existingData = JSON.parse(existing.data);
        const existingMachineId = existingData.machineId || "";
        if (existingMachineId && existingMachineId !== incomingMachineId) {
          return {
            error: "agentId_conflict",
            message: `agentId "${agentId}" belongs to machine "${existingMachineId}"`,
            existingMachine: existingMachineId,
          };
        }
      }
    }

    const now = new Date().toISOString();

    if (Object.keys(body).length > 1) {
      // Full data update — upsert to handle renamed agents
      const data = JSON.stringify(body);
      const channels = JSON.stringify(Array.isArray(body.channels) ? body.channels : []);
      const result = db.prepare(
        `UPDATE registry SET data = ?, lastHeartbeat = ?, channels = ? WHERE agentId = ?`,
      ).run(data, now, channels, agentId);
      if (result.changes === 0) {
        // Agent not in registry yet (e.g., after conflict rename) — insert
        db.prepare(
          `INSERT INTO registry (agentId, data, lastHeartbeat, createdAt, channels)
           VALUES (?, ?, ?, ?, ?)`,
        ).run(agentId, data, now, now, channels);
      }
    } else {
      // Heartbeat only
      db.prepare(
        `UPDATE registry SET lastHeartbeat = ? WHERE agentId = ?`,
      ).run(now, agentId);
    }

    return { status: "ok", agentId, lastHeartbeat: now };
  });

  // Discover — list all registered gateways
  app.get("/api/v1/registry/discover", async () => {
    const rows = db
      .prepare(`SELECT agentId, data, lastHeartbeat, createdAt, channels FROM registry ORDER BY agentId`)
      .all() as Array<{
      agentId: string;
      data: string;
      lastHeartbeat: string;
      createdAt: string;
      channels: string;
    }>;

    return {
      agents: rows.map((r) => ({
        ...JSON.parse(r.data),
        lastHeartbeat: r.lastHeartbeat,
        channels: JSON.parse(r.channels ?? "[]"),
      })),
    };
  });

  // Whois — get a specific gateway
  app.get("/api/v1/registry/whois/:agentId", async (request, reply) => {
    const { agentId } = request.params as { agentId: string };
    const row = db
      .prepare(`SELECT data, lastHeartbeat, channels FROM registry WHERE agentId = ?`)
      .get(agentId) as { data: string; lastHeartbeat: string; channels: string } | undefined;

    if (!row) {
      reply.code(404).send({ error: `Agent "${agentId}" not found` });
      return;
    }

    return {
      ...JSON.parse(row.data),
      lastHeartbeat: row.lastHeartbeat,
      channels: JSON.parse(row.channels ?? "[]"),
    };
  });

  // Deregister — remove a gateway
  app.delete("/api/v1/registry/:agentId", async (request) => {
    const { agentId } = request.params as { agentId: string };
    db.prepare(`DELETE FROM registry WHERE agentId = ?`).run(agentId);
    return { status: "ok", agentId };
  });
}
