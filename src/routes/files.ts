import type { FastifyInstance } from "fastify";
import { writeFileSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { v4 as uuid } from "uuid";
import { db } from "../db.js";
import { config } from "../config.js";

export function registerFileRoutes(app: FastifyInstance): void {
  app.post("/api/v1/files/upload", async (request) => {
    const body = request.body as {
      fromAgent: string;
      toAgent: string;
      filename: string;
      content: string;
      metadata?: Record<string, unknown>;
    };

    const id = uuid();
    const diskPath = join(config.dataDir, "files", `${id}.bin`);
    const buffer = Buffer.from(body.content, "base64");
    writeFileSync(diskPath, buffer);

    const createdAt = new Date().toISOString();
    db.prepare(
      `INSERT INTO files (id, fromAgent, toAgent, filename, diskPath, size, metadata, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    ).run(
      id,
      body.fromAgent,
      body.toAgent,
      body.filename,
      diskPath,
      buffer.length,
      JSON.stringify(body.metadata ?? {}),
      createdAt,
    );

    return { id, status: "pending", createdAt };
  });

  app.get("/api/v1/files/pending", async (request) => {
    const { agent } = request.query as { agent: string };
    const rows = db
      .prepare(
        `SELECT id, fromAgent, filename, size, metadata, createdAt
         FROM files WHERE toAgent = ? AND status = 'pending'
         ORDER BY createdAt ASC`,
      )
      .all(agent) as Array<{
      id: string;
      fromAgent: string;
      filename: string;
      size: number;
      metadata: string;
      createdAt: string;
    }>;

    return {
      files: rows.map((r) => ({
        ...r,
        metadata: JSON.parse(r.metadata),
      })),
    };
  });

  app.get("/api/v1/files/download/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const row = db.prepare(`SELECT diskPath FROM files WHERE id = ?`).get(id) as
      | { diskPath: string }
      | undefined;

    if (!row) {
      reply.code(404).send({ error: "File not found" });
      return;
    }

    try {
      const content = readFileSync(row.diskPath);
      return { content: content.toString("base64") };
    } catch {
      reply.code(404).send({ error: "File data not found on disk" });
    }
  });

  app.post("/api/v1/files/ack/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const row = db.prepare(`SELECT diskPath FROM files WHERE id = ?`).get(id) as
      | { diskPath: string }
      | undefined;

    if (!row) {
      reply.code(404).send({ error: "File not found" });
      return;
    }

    try {
      unlinkSync(row.diskPath);
    } catch {}
    db.prepare(`UPDATE files SET status = 'acknowledged' WHERE id = ?`).run(id);

    return { status: "acknowledged" };
  });
}
