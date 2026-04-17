import { sendTo, isConnected } from '../relay/connections.js';
import { v4 as uuidv4 } from 'uuid';

interface PendingChat {
  resolve: (reply: string) => void;
  timer: ReturnType<typeof setTimeout>;
}

const pendingChats = new Map<string, PendingChat>();

export function sendChatMessage(
  targetAgentId: string,
  message: string,
  image?: string,
  supportsVision?: boolean,
): Promise<string> {
  if (!isConnected(targetAgentId)) {
    return Promise.resolve('Error: ' + targetAgentId + ' is not connected to Hub');
  }
  const msgId = 'chat_' + uuidv4().slice(0, 8);

  let payload: string;
  if (image && supportsVision) {
    payload = JSON.stringify({ text: message, image });
  } else if (image) {
    payload = message + '\n\n[An image was uploaded and saved to your _inbox/hub/ directory. Please acknowledge receipt.]';
  } else {
    payload = message;
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pendingChats.delete(msgId);
      resolve('Error: Agent did not respond within 60 seconds');
    }, 60_000);
    pendingChats.set(msgId, { resolve, timer });
    sendTo(targetAgentId, {
      type: 'message', id: msgId, from: 'manager', to: targetAgentId, payload,
    });
  });
}

export function handleChatReply(msg: any): boolean {
  if (msg.type === 'message_reply' && msg.replyTo && pendingChats.has(msg.replyTo)) {
    const pending = pendingChats.get(msg.replyTo)!;
    clearTimeout(pending.timer);
    pendingChats.delete(msg.replyTo);
    pending.resolve(msg.payload || 'No response');
    return true;
  }
  return false;
}
