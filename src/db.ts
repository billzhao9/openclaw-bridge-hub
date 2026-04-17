import Database, { type Database as DatabaseType } from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { config } from "./config.js";

mkdirSync(config.dataDir, { recursive: true });
mkdirSync(join(config.dataDir, "files"), { recursive: true });

const dbPath = join(config.dataDir, "relay.db");
export const db: DatabaseType = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    fromAgent TEXT NOT NULL,
    toAgent TEXT NOT NULL,
    filename TEXT NOT NULL,
    diskPath TEXT NOT NULL,
    size INTEGER NOT NULL DEFAULT 0,
    metadata TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending',
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS commands (
    id TEXT PRIMARY KEY,
    fromAgent TEXT NOT NULL,
    toAgent TEXT NOT NULL,
    type TEXT NOT NULL,
    payload TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'queued',
    response TEXT,
    createdAt TEXT NOT NULL,
    respondedAt TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_files_toAgent_status ON files(toAgent, status);
  CREATE INDEX IF NOT EXISTS idx_commands_toAgent_status ON commands(toAgent, status);

  CREATE TABLE IF NOT EXISTS registry (
    agentId TEXT PRIMARY KEY,
    data TEXT NOT NULL DEFAULT '{}',
    lastHeartbeat TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    channels TEXT DEFAULT '[]'
  );
`);

try {
  db.exec(`ALTER TABLE registry ADD COLUMN channels TEXT DEFAULT '[]'`);
} catch (e) {
  // Column already exists, ignore
}
