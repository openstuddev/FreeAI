import { describe, it, expect, beforeEach } from "vitest";
import { openDb } from "./index.js";
import { createUsersRepo } from "./users.js";

let db;
let users;

beforeEach(() => {
  db = openDb(":memory:");
  users = createUsersRepo(db);
});

describe("usersRepo.getOrCreate", () => {
  it("creates a new user with default model", () => {
    const u = users.getOrCreate(42, "gpt-5-nano");
    expect(u.telegram_id).toBe(42);
    expect(u.model).toBe("gpt-5-nano");
    expect(u.puter_token).toBeNull();
    expect(u.system_prompt).toBeNull();
  });

  it("returns the same user on subsequent calls", () => {
    const a = users.getOrCreate(1, "gpt-5-nano");
    const b = users.getOrCreate(1, "gpt-5-nano");
    expect(a.created_at).toBe(b.created_at);
  });
});

describe("usersRepo.setToken / clearToken", () => {
  it("stores and clears token + username", () => {
    users.getOrCreate(1, "gpt-5-nano");
    users.setToken(1, "tok-abc", "alice");
    let u = users.get(1);
    expect(u.puter_token).toBe("tok-abc");
    expect(u.puter_username).toBe("alice");

    users.clearToken(1);
    u = users.get(1);
    expect(u.puter_token).toBeNull();
    expect(u.puter_username).toBeNull();
  });
});

describe("usersRepo.setModel", () => {
  it("updates model only", () => {
    users.getOrCreate(1, "gpt-5-nano");
    users.setModel(1, "claude-sonnet-4-5");
    expect(users.get(1).model).toBe("claude-sonnet-4-5");
  });
});

describe("usersRepo.setSystemPrompt / clearSystemPrompt", () => {
  it("sets and clears", () => {
    users.getOrCreate(1, "gpt-5-nano");
    users.setSystemPrompt(1, "You are concise.");
    expect(users.get(1).system_prompt).toBe("You are concise.");
    users.clearSystemPrompt(1);
    expect(users.get(1).system_prompt).toBeNull();
  });
});

describe("usersRepo.subscription", () => {
  it("markSubscriptionVerified writes a timestamp", () => {
    users.getOrCreate(1, "gpt-5-nano");
    const before = Date.now();
    users.markSubscriptionVerified(1);
    const u = users.get(1);
    expect(u.subscription_verified_at).toBeGreaterThanOrEqual(before);
  });

  it("clearSubscriptionVerified nulls the field", () => {
    users.getOrCreate(1, "gpt-5-nano");
    users.markSubscriptionVerified(1);
    users.clearSubscriptionVerified(1);
    expect(users.get(1).subscription_verified_at).toBeNull();
  });
});
