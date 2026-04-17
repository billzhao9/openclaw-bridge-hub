import { sendTo, isConnected } from '../connections.js';
import {
  createSession, getSession, switchAgent, endSession, touchSession,
} from '../sessions.js';
import type {
  HandoffStart, HandoffAck, HandoffMessage, HandoffReply,
  HandoffSwitch, HandoffEnd,
} from '../types.js';

export function handleHandoffStart(msg: HandoffStart): void {
  if (!isConnected(msg.to)) {
    sendTo(msg.from, {
      type: 'error',
      code: 'AGENT_OFFLINE',
      message: `${msg.to} is not connected`,
    });
    return;
  }

  const session = createSession(msg.from, msg.to, msg.reason);

  // Forward to target agent with the server-assigned sessionId
  sendTo(msg.to, {
    type: 'handoff_start',
    sessionId: session.sessionId,
    from: msg.from,
    to: msg.to,
    reason: msg.reason,
  });

  // Immediately ack to origin with assigned sessionId so client can resolve sendAndWait
  sendTo(msg.from, {
    type: 'handoff_ack',
    sessionId: session.sessionId,
    from: msg.to,
  });
}

export function handleHandoffAck(msg: HandoffAck): void {
  const session = getSession(msg.sessionId);
  if (!session) return;

  sendTo(session.proxyAgent, {
    type: 'handoff_ack',
    sessionId: msg.sessionId,
    from: msg.from,
  });
}

export function handleHandoffMessage(msg: HandoffMessage): void {
  const session = getSession(msg.sessionId);
  if (!session) {
    sendTo(msg.from, {
      type: 'error',
      code: 'SESSION_NOT_FOUND',
      message: `Session ${msg.sessionId} does not exist`,
    });
    return;
  }

  touchSession(msg.sessionId);

  const sent = sendTo(session.currentAgent, {
    type: 'handoff_message',
    sessionId: msg.sessionId,
    from: msg.from,
    to: session.currentAgent,
    payload: msg.payload,
  });

  if (!sent) {
    endSession(msg.sessionId);
    sendTo(session.proxyAgent, {
      type: 'error',
      code: 'AGENT_DISCONNECTED',
      message: `${session.currentAgent} disconnected, session ended`,
    });
  }
}

export function handleHandoffReply(msg: HandoffReply): void {
  const session = getSession(msg.sessionId);
  if (!session) return;

  touchSession(msg.sessionId);

  sendTo(session.proxyAgent, {
    type: 'handoff_reply',
    sessionId: msg.sessionId,
    from: msg.from,
    to: session.proxyAgent,
    payload: msg.payload,
  });
}

export function handleHandoffSwitch(msg: HandoffSwitch): void {
  const session = getSession(msg.sessionId);
  if (!session) return;

  if (!isConnected(msg.to)) {
    sendTo(msg.from, {
      type: 'error',
      code: 'AGENT_OFFLINE',
      message: `${msg.to} is not connected`,
    });
    return;
  }

  const oldAgent = session.currentAgent;
  switchAgent(msg.sessionId, msg.to);

  // Notify old agent: you're released
  sendTo(oldAgent, {
    type: 'handoff_end',
    sessionId: msg.sessionId,
  });

  // Notify new agent: you're taking over
  sendTo(msg.to, {
    type: 'handoff_start',
    sessionId: msg.sessionId,
    from: session.proxyAgent,
    to: msg.to,
    reason: 'session switch',
  });

  // Notify proxy: switch happened
  sendTo(session.proxyAgent, {
    type: 'handoff_switch',
    sessionId: msg.sessionId,
    from: oldAgent,
    to: msg.to,
  });
}

export function handleHandoffEnd(msg: HandoffEnd): void {
  const session = endSession(msg.sessionId);
  if (!session) return;

  // Notify current agent: you're released
  sendTo(session.currentAgent, {
    type: 'handoff_end',
    sessionId: msg.sessionId,
  });

  // Notify proxy: session ended, you're back in control
  sendTo(session.proxyAgent, {
    type: 'handoff_end',
    sessionId: msg.sessionId,
  });
}
