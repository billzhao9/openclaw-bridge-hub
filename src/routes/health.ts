import type { FastifyInstance } from "fastify";
import { db } from "../db.js";
import { readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../config.js";

let HUB_VERSION = 'unknown';
try {
  const pkgPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'package.json');
  HUB_VERSION = JSON.parse(readFileSync(pkgPath, 'utf-8')).version;
} catch {}

export function registerHealthRoutes(app: FastifyInstance): void {
  app.get("/api/v1/health", async () => {
    return { status: "ok", version: HUB_VERSION, timestamp: new Date().toISOString() };
  });

  app.get("/api/v1/stats", async () => {
    const pendingFiles = (
      db.prepare(`SELECT COUNT(*) as count FROM files WHERE status = 'pending'`).get() as {
        count: number;
      }
    ).count;
    const queuedCommands = (
      db.prepare(`SELECT COUNT(*) as count FROM commands WHERE status = 'queued'`).get() as {
        count: number;
      }
    ).count;

    let diskUsageBytes = 0;
    try {
      const dbFile = join(config.dataDir, "relay.db");
      try { diskUsageBytes += statSync(dbFile).size; } catch {}
      const rows = db.prepare(`SELECT diskPath FROM files WHERE status = 'pending'`).all() as Array<{ diskPath: string }>;
      for (const r of rows) {
        try { diskUsageBytes += statSync(r.diskPath).size; } catch {}
      }
    } catch {}

    return {
      pendingFiles,
      queuedCommands,
      diskUsageBytes,
      diskUsageMB: Math.round(diskUsageBytes / 1024 / 1024 * 100) / 100,
    };
  });
}
