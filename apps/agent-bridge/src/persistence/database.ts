import { DatabaseSync } from "node:sqlite";

/** Existing schema and restart recovery; opening does not reset saved history. */
export function openDatabase(path: string) {
  const db = new DatabaseSync(path);
  db.exec(`
      PRAGMA foreign_keys = ON;
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS threads (
        id TEXT PRIMARY KEY, project TEXT NOT NULL, title TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS agent_sessions (
        id TEXT PRIMARY KEY, thread_id TEXT NOT NULL UNIQUE REFERENCES threads(id),
        agent TEXT NOT NULL, external_id TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY, thread_id TEXT NOT NULL REFERENCES threads(id),
        role TEXT NOT NULL, content TEXT NOT NULL, references_json TEXT NOT NULL,
        context_json TEXT NOT NULL, status TEXT NOT NULL, error TEXT, created_at TEXT NOT NULL
      );
      UPDATE messages SET status = 'failed', error = 'Bridge stopped during this response.' WHERE status = 'running';
    `);
  return db;
}
