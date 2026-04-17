import { sendTo } from '../connections.js';
import type { RelayMessage, RelayReply } from '../types.js';
import { handleChatReply } from '../../manager/chat.js';

export function handleRelayMessage(msg: RelayMessage): void {
  const sent = sendTo(msg.to, msg);
  if (!sent) {
    sendTo(msg.from, {
      type: 'error',
      code: 'AGENT_OFFLINE',
      message: `${msg.to} is not connected`,
    });
  }
}

export function handleRelayReply(msg: RelayReply): void {
  if (handleChatReply(msg)) return;
  const sent = sendTo(msg.to, msg);
  if (!sent) {
    sendTo(msg.from, {
      type: 'error',
      code: 'AGENT_OFFLINE',
      message: `${msg.to} is not connected to receive reply`,
    });
  }
}
