import type { DatabaseSync } from "node:sqlite";
import { openDatabase } from "./database.ts";
import type {
  SendRequest,
  SavedMessage,
  ThreadDetail,
  ThreadSummary,
} from "@pointback/protocol";

type ThreadRow = {
  id: string;
  title: string;
  updated_at: string;
  project: string;
};

export class ConversationStore {
  private db: DatabaseSync;
  constructor(path: string) {
    this.db = openDatabase(path);
  }
  close() {
    if (this.db.isOpen) this.db.close();
  }
  list(project: string): ThreadSummary[] {
    return (
      this.db
        .prepare(
          "SELECT * FROM threads WHERE project = ? ORDER BY updated_at DESC LIMIT 100",
        )
        .all(project) as ThreadRow[]
    ).map((r) => ({ id: r.id, title: r.title, updatedAt: r.updated_at }));
  }
  get(id: string, project: string): ThreadDetail | undefined {
    const row = this.db
      .prepare("SELECT * FROM threads WHERE id = ? AND project = ?")
      .get(id, project) as ThreadRow | undefined;
    if (!row) return undefined;
    const messages = this.db
      .prepare("SELECT * FROM messages WHERE thread_id = ? ORDER BY rowid")
      .all(id);
    return {
      id,
      title: row.title,
      updatedAt: row.updated_at,
      messages: messages.map((r) => ({
        id: String(r.id),
        role: r.role as SavedMessage["role"],
        content: String(r.content),
        references: JSON.parse(String(r.references_json)),
        context: JSON.parse(String(r.context_json)),
        status: r.status as SavedMessage["status"],
        ...(r.error ? { error: String(r.error) } : {}),
        createdAt: String(r.created_at),
      })),
    };
  }
  hasRequest(id: string) {
    return !!this.db.prepare("SELECT id FROM messages WHERE id = ?").get(id);
  }
  start(project: string, request: SendRequest) {
    const threadId = request.threadId ?? crypto.randomUUID();
    const assistantId = crypto.randomUUID();
    const now = new Date().toISOString();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      if (!request.threadId)
        this.db
          .prepare("INSERT INTO threads VALUES (?, ?, ?, ?)")
          .run(threadId, project, request.message.content.slice(0, 100), now);
      this.db
        .prepare("UPDATE threads SET updated_at = ? WHERE id = ?")
        .run(now, threadId);
      const insert = this.db.prepare(
        "INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      );
      insert.run(
        request.requestId,
        threadId,
        "user",
        request.message.content,
        JSON.stringify(request.message.references),
        JSON.stringify(request.context),
        "completed",
        null,
        now,
      );
      insert.run(
        assistantId,
        threadId,
        "assistant",
        "",
        "[]",
        '{"selectedComponents":[]}',
        "running",
        null,
        now,
      );
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    return { threadId, assistantId };
  }
  session(threadId: string): string | undefined {
    const row = this.db
      .prepare("SELECT external_id FROM agent_sessions WHERE thread_id = ?")
      .get(threadId);
    return row ? String(row.external_id) : undefined;
  }
  saveSession(threadId: string, externalId: string) {
    this.db
      .prepare(
        `INSERT INTO agent_sessions VALUES (?, ?, 'codex', ?)
      ON CONFLICT(thread_id) DO UPDATE SET external_id = excluded.external_id`,
      )
      .run(crypto.randomUUID(), threadId, externalId);
  }
  updateAssistant(
    id: string,
    content: string,
    status: SavedMessage["status"],
    error?: string,
  ) {
    this.db
      .prepare(
        "UPDATE messages SET content = ?, status = ?, error = ? WHERE id = ?",
      )
      .run(content, status, error ?? null, id);
    this.db
      .prepare(
        "UPDATE threads SET updated_at = ? WHERE id = (SELECT thread_id FROM messages WHERE id = ?)",
      )
      .run(new Date().toISOString(), id);
  }
}
