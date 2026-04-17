// === WebSocket Protocol Messages ===

export interface AuthMessage {
  type: 'auth';
  agentId: string;
  apiKey: string;
  machineId?: string;
  bridgeVersion?: string;
}

export interface AuthOkMessage {
  type: 'auth_ok';
}

export interface AuthErrorMessage {
  type: 'auth_error';
  reason: string;
}

export interface AuthConflictMessage {
  type: 'auth_conflict';
  existingMachine: string;
  suggestedId: string;
}

export interface RelayMessage {
  type: 'message';
  id: string;
  from: string;
  to: string;
  payload: string;
}

export interface RelayReply {
  type: 'message_reply';
  replyTo: string;
  from: string;
  to: string;
  payload: string;
}

export interface HandoffStart {
  type: 'handoff_start';
  sessionId: string;
  from: string;
  to: string;
  reason: string;
}

export interface HandoffAck {
  type: 'handoff_ack';
  sessionId: string;
  from: string;
}

export interface HandoffMessage {
  type: 'handoff_message';
  sessionId: string;
  from: string;
  to: string;
  payload: string;
}

export interface HandoffReply {
  type: 'handoff_reply';
  sessionId: string;
  from: string;
  to: string;
  payload: string;
}

export interface HandoffSwitch {
  type: 'handoff_switch';
  sessionId: string;
  from: string;
  to: string;
}

export interface HandoffEnd {
  type: 'handoff_end';
  sessionId: string;
}

export interface ErrorMessage {
  type: 'error';
  code: string;
  message: string;
}

export type IncomingMessage =
  | AuthMessage
  | RelayMessage
  | RelayReply
  | HandoffStart
  | HandoffAck
  | HandoffMessage
  | HandoffReply
  | HandoffSwitch
  | HandoffEnd;

export type OutgoingMessage =
  | AuthOkMessage
  | AuthErrorMessage
  | AuthConflictMessage
  | RelayMessage
  | RelayReply
  | HandoffStart
  | HandoffAck
  | HandoffMessage
  | HandoffReply
  | HandoffSwitch
  | HandoffEnd
  | ErrorMessage;

// === Session State ===

export interface HandoffSession {
  sessionId: string;
  originAgent: string;
  proxyAgent: string;
  currentAgent: string;
  history: string[];
  startedAt: string;
  lastActivityAt: string;
}
