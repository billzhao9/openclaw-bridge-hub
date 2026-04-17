import type { IncomingMessage } from '../types.js';
import { handleRelayMessage, handleRelayReply } from './message.js';
import {
  handleHandoffStart, handleHandoffAck, handleHandoffMessage,
  handleHandoffReply, handleHandoffSwitch, handleHandoffEnd,
} from './handoff.js';

export function dispatch(msg: IncomingMessage, senderAgentId: string): void {
  // Validate sender matches message 'from' field
  if ('from' in msg && msg.from !== senderAgentId) {
    return; // Reject spoofed messages silently
  }

  switch (msg.type) {
    case 'message':       return handleRelayMessage(msg);
    case 'message_reply': return handleRelayReply(msg);
    case 'handoff_start': return handleHandoffStart(msg);
    case 'handoff_ack':   return handleHandoffAck(msg);
    case 'handoff_message': return handleHandoffMessage(msg);
    case 'handoff_reply':   return handleHandoffReply(msg);
    case 'handoff_switch':  return handleHandoffSwitch(msg);
    case 'handoff_end':     return handleHandoffEnd(msg);
    default:
      break;
  }
}
