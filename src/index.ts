import Fastify from "fastify";
import { config } from "./config.js";
import { db } from "./db.js";
import { registerFileRoutes } from "./routes/files.js";
import { registerCommandRoutes } from "./routes/commands.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerRegistryRoutes } from "./routes/registry.js";
import { registerDebugRoutes } from "./routes/debug.js";
import { authMiddleware } from "./middleware/auth.js";
import { startCleanup } from "./cleanup.js";
import { registerWebSocket } from "./relay/ws-handler.js";
import { startManagerServer } from "./manager/index.js";

// On startup, mark all existing registry entries as offline since no WS connections exist yet.
// Agents will re-register and go back to "online" when they reconnect.
try {
  const rows = db.prepare('SELECT agentId, data FROM registry').all() as Array<{ agentId: string; data: string }>;
  if (rows.length > 0) {
    const update = db.prepare('UPDATE registry SET data = ? WHERE agentId = ?');
    for (const row of rows) {
      const data = JSON.parse(row.data);
      data.status = 'offline';
      update.run(JSON.stringify(data), row.agentId);
    }
    console.log(`[startup] Marked ${rows.length} stale registry entries as offline`);
  }
} catch (err) {
  console.warn('[startup] Failed to clean stale registry:', err);
}

const app = Fastify({ logger: true });

app.addHook("onRequest", authMiddleware);

registerFileRoutes(app);
registerCommandRoutes(app);
registerHealthRoutes(app);
registerRegistryRoutes(app);
registerDebugRoutes(app);
try {
  await registerWebSocket(app, config.apiKey);
  console.log("WebSocket relay registered at /ws");
} catch (err) {
  console.error("Failed to register WebSocket relay (HTTP API still available):", err);
}

// Register manager WebSocket on main port too (Local Managers connect here)
try {
  const { registerManagerWebSocket } = await import("./manager/ws-manager.js");
  await registerManagerWebSocket(app);
  console.log("Manager WebSocket registered at /ws/manager");
} catch (err) {
  console.error("Failed to register manager WebSocket:", err);
}

const cleanupTimer = startCleanup(app.log);

const shutdown = async () => {
  clearInterval(cleanupTimer);
  await app.close();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

app.listen({ port: config.port, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    console.error("Failed to start FileRelay:", err);
    process.exit(1);
  }
  console.log(`Bridge FileRelay listening on ${address}`);
});

startManagerServer().catch(err => {
  console.error('[manager] Failed to start management panel:', err);
});
