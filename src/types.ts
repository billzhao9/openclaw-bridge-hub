export interface FileRecord {
  id: string;
  fromAgent: string;
  toAgent: string;
  filename: string;
  diskPath: string;
  size: number;
  metadata: string;
  status: "pending" | "acknowledged";
  createdAt: string;
}

export interface CommandRecord {
  id: string;
  fromAgent: string;
  toAgent: string;
  type: string;
  payload: string;
  status: "queued" | "responded" | "error";
  response: string | null;
  createdAt: string;
  respondedAt: string | null;
}
