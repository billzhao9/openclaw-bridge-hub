import type { FastifyInstance } from "fastify";
import { v4 as uuid } from "uuid";
import { db } from "../db.js";

export function registerCommandRoutes(app: FastifyInstance): void {
  app.post("/api/v1/commands/enqueue", async (request) => {
    const body = request.body as {
      fromAgent: string;
      toAgent: string;
      type: string;
      payload: Record<string, unknown>;
    };

    const id = uuid();
    const createdAt = new Date().toISOString();
    db.prepare(
      `INSERT INTO commands (id, fromAgent, toAgent, type, payload, status, createdAt)
       VALUES (?, ?, ?, ?, ?, 'queued', ?)`,
    ).run(id, body.fromAgent, body.toAgent, body.type, JSON.stringify(body.payload), createdAt);

    return { id, status: "queued" };
  });

  app.get("/api/v1/commands/pending", async (request) => {
    const { agent } = request.query as { agent: string };
    const rows = db
      .prepare(
        `SELECT id, fromAgent, type, payload, createdAt
         FROM commands WHERE toAgent = ? AND status = 'queued'
         ORDER BY createdAt ASC`,
      )
      .all(agent) as Array<{
      id: string;
      fromAgent: string;
      type: string;
      payload: string;
      createdAt: string;
    }>;

    return {
      commands: rows.map((r) => ({
        ...r,
        payload: JSON.parse(r.payload),
      })),
    };
  });

  app.post("/api/v1/commands/respond/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      status: "ok" | "error";
      payload: Record<string, unknown>;
    };

    const existing = db.prepare(`SELECT id FROM commands WHERE id = ?`).get(id);
    if (!existing) {
      reply.code(404).send({ error: "Command not found" });
      return;
    }

    db.prepare(
      `UPDATE commands SET status = ?, response = ?, respondedAt = ? WHERE id = ?`,
    ).run(
      body.status === "ok" ? "responded" : "error",
      JSON.stringify(body.payload),
      new Date().toISOString(),
      id,
    );

    return { status: "updated" };
  });

  app.get("/api/v1/commands/result/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const row = db.prepare(`SELECT status, response FROM commands WHERE id = ?`).get(id) as
      | { status: string; response: string | null }
      | undefined;

    if (!row) {
      reply.code(404).send({ error: "Command not found" });
      return;
    }

    if (row.status === "queued") {
      return { status: "queued" };
    }

    return {
      status: row.status === "responded" ? "ok" : "error",
      payload: row.response ? JSON.parse(row.response) : null,
    };
  });
}
