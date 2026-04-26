import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    telegram_id              INTEGER PRIMARY KEY,
    puter_token              TEXT,
    puter_username           TEXT,
    model                    TEXT NOT NULL DEFAULT 'gpt-5-nano',
    system_prompt            TEXT,
    subscription_verified_at INTEGER,
    created_at               INTEGER NOT NULL,
    updated_at               INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER NOT NULL,
    role        TEXT NOT NULL,
    content     TEXT NOT NULL,
    created_at  INTEGER NOT NULL,
    FOREIGN KEY (telegram_id) REFERENCES users(telegram_id)
  );

  CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(telegram_id, id DESC);
`;

/**
 * Open (or create) a SQLite database and ensure schema is in place.
 * Pass ":memory:" for tests.
 */
export function openDb(path) {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}
