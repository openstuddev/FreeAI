import { describe, it, expect, beforeEach } from "vitest";
import { openDb } from "./index.js";
import { createUsersRepo } from "./users.js";
import { createMessagesRepo } from "./messages.js";

let db, users, messages;

beforeEach(() => {
  db = openDb(":memory:");
  users = createUsersRepo(db);
  messages = createMessagesRepo(db);
  users.getOrCreate(7, "gpt-5-nano");
});

describe("messagesRepo.recordExchange", () => {
  it("inserts user + assistant in one transaction", () => {
    messages.recordExchange(7, "hi", "hello!");
    const all = messages.getRecent(7, 10);
    expect(all).toEqual([
      { role: "user", content: "hi" },
      { role: "assistant", content: "hello!" },
    ]);
  });
});

describe("messagesRepo.getRecent", () => {
  it("returns the N most recent in chronological order", () => {
    for (let i = 0; i < 5; i++) {
      messages.recordExchange(7, `q${i}`, `a${i}`);
    }
    // After 5 exchanges the rows in insertion order are:
    //   q0,a0,q1,a1,q2,a2,q3,a3,q4,a4
    // The last 4 chronologically: q3, a3, q4, a4
    const last4 = messages.getRecent(7, 4);
    expect(last4).toEqual([
      { role: "user",      content: "q3" },
      { role: "assistant", content: "a3" },
      { role: "user",      content: "q4" },
      { role: "assistant", content: "a4" },
    ]);
  });

  it("returns [] when there are no messages", () => {
    expect(messages.getRecent(7, 10)).toEqual([]);
  });

  it("isolates by telegram_id", () => {
    users.getOrCreate(8, "gpt-5-nano");
    messages.recordExchange(7, "for-7", "ans-7");
    messages.recordExchange(8, "for-8", "ans-8");
    const seven = messages.getRecent(7, 10);
    expect(seven.every((m) => m.content.includes("7"))).toBe(true);
  });
});

describe("messagesRepo.deleteAll", () => {
  it("removes only the given user's messages", () => {
    users.getOrCreate(8, "gpt-5-nano");
    messages.recordExchange(7, "a", "b");
    messages.recordExchange(8, "c", "d");
    messages.deleteAll(7);
    expect(messages.getRecent(7, 10)).toEqual([]);
    expect(messages.getRecent(8, 10).length).toBe(2);
  });
});
