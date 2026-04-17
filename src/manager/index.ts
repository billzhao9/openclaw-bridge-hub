import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import { config } from '../config.js';
import { registerManagerApi } from './api.js';
import { registerManagerWebSocket } from './ws-manager.js';
import { getDashboardHtml } from './dashboard.js';

export async function startManagerServer() {
  if (!config.managerPass) {
    console.log('[manager] MANAGER_PASS not set, management panel disabled');
    return;
  }
  const app = Fastify({ logger: true });
  await app.register(websocket);

  app.get('/', async (request, reply) => {
    reply.type('text/html').send(getDashboardHtml());
  });

  registerManagerApi(app);
  await registerManagerWebSocket(app);

  await app.listen({ port: config.managerPort, host: '0.0.0.0' });
  console.log('[manager] Management panel listening on port ' + config.managerPort);
}
