import { unlinkSync } from "node:fs";
import { db } from "./db.js";
import { config } from "./config.js";
import { closeAndRemoveByAgentId } from "./relay/connections.js";

export function startCleanup(logger?: { info: (msg: string) => void }): ReturnType<typeof setInterval> {
  return setInterval(() => {
    const now = Date.now();

    const oldFiles = db
      .prepare(
        `SELECT id, diskPath FROM files
         WHERE status = 'acknowledged'
            OR (createdAt < ? AND status = 'pending')`,
      )
      .all(new Date(now - config.fileTtlMs).toISOString()) as Array<{
      id: string;
      diskPath: string;
    }>;

    for (const f of oldFiles) {
      try { unlinkSync(f.diskPath); } catch {}
      db.prepare(`DELETE FROM files WHERE id = ?`).run(f.id);
    }

    db.prepare(
      `DELETE FROM commands
       WHERE (status IN ('responded', 'error'))
          OR (createdAt < ? AND status = 'queued')`,
    ).run(new Date(now - config.commandTtlMs).toISOString());

    // Clean stale registry entries — agents that haven't sent a heartbeat in registryTtlMs
    // Also close any lingering WebSocket connections for stale agents
    const staleThreshold = new Date(now - config.registryTtlMs).toISOString();
    const staleRows = db
      .prepare(`SELECT agentId FROM registry WHERE lastHeartbeat < ?`)
      .all(staleThreshold) as Array<{ agentId: string }>;
    if (staleRows.length > 0) {
      const del = db.prepare(`DELETE FROM registry WHERE agentId = ?`);
      for (const row of staleRows) {
        const closed = closeAndRemoveByAgentId(row.agentId);
        del.run(row.agentId);
        logger?.info(`[cleanup] Removed stale agent "${row.agentId}"${closed ? ' (WebSocket closed)' : ''}`);
      }
    }
  }, config.cleanupIntervalMs);
}
