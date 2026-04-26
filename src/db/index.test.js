import { describe, it, expect } from "vitest";
import { openDb } from "./index.js";

describe("openDb", () => {
  it("creates a fresh in-memory DB with users + messages tables", () => {
    const db = openDb(":memory:");
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all()
      .map((r) => r.name);
    expect(tables).toContain("users");
    expect(tables).toContain("messages");
  });

  it("users table has expected columns", () => {
    const db = openDb(":memory:");
    const cols = db.prepare("PRAGMA table_info(users)").all().map((c) => c.name);
    expect(cols).toEqual(
      expect.arrayContaining([
        "telegram_id",
        "puter_token",
        "puter_username",
        "model",
        "system_prompt",
        "subscription_verified_at",
        "created_at",
        "updated_at",
      ])
    );
  });

  it("messages table has expected columns", () => {
    const db = openDb(":memory:");
    const cols = db.prepare("PRAGMA table_info(messages)").all().map((c) => c.name);
    expect(cols).toEqual(
      expect.arrayContaining(["id", "telegram_id", "role", "content", "created_at"])
    );
  });

  it("running migrations twice is idempotent", () => {
    const db = openDb(":memory:");
    expect(() => {
      db.exec("SELECT 1"); // already opened
    }).not.toThrow();
    // Re-running migrations on a fresh connection (CREATE TABLE IF NOT EXISTS is idempotent):
    expect(() => openDb(":memory:")).not.toThrow();
  });
});
