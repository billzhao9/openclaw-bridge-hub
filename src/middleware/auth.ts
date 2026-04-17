import type { FastifyRequest, FastifyReply } from "fastify";
import { config } from "../config.js";

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (!config.apiKey) return;
  // Skip auth for WebSocket upgrade requests (WS has its own auth protocol)
  if (request.headers.upgrade === "websocket") return;
  const key = request.headers["x-api-key"];
  if (key !== config.apiKey) {
    reply.code(401).send({ error: "Invalid API key" });
  }
}
