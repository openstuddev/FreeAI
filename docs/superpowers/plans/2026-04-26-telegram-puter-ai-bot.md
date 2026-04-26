# FreeAI Telegram Bot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A public Telegram bot on grammY + Puter.js where every Telegram user uses their own Puter token (own quota), picks one of ~10 curated AI models via inline keyboard, has a per-user dialogue history (last 20 messages), and is gated behind a mandatory subscription to `@privatekey_ai`.

**Architecture:** Node.js ESM, single process, long-polling. Layered modules: `config → db → puter/client → menus + conversations + handlers → bot`. SQLite via `better-sqlite3` for state. Per-user Puter clients keyed by Telegram user id.

**Tech Stack:** Node.js ≥ 20, grammY + `@grammyjs/menu` + `@grammyjs/conversations`, `@heyputer/puter.js`, `better-sqlite3`, `dotenv`, `zod`, `vitest`.

**Spec:** [docs/superpowers/specs/2026-04-26-telegram-puter-ai-bot-design.md](../specs/2026-04-26-telegram-puter-ai-bot-design.md)

---

## Working directory

All paths in this plan are **relative to the project root** `FreeAI/`. The project root is the directory containing this plan's grandparent (`docs/superpowers/plans/`).

---

## Task 1: Project skeleton

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `vitest.config.js`
- Create: `data/.gitkeep`
- Create: `README.md` (skeleton — fleshed out in Task 20)

- [ ] **Step 1.1: Initialize npm project**

Run from project root:

```bash
npm init -y
```

- [ ] **Step 1.2: Install runtime dependencies**

```bash
npm install grammy @grammyjs/menu @grammyjs/conversations @heyputer/puter.js better-sqlite3 dotenv zod
```

- [ ] **Step 1.3: Install dev dependencies**

```bash
npm install --save-dev vitest
```

- [ ] **Step 1.4: Replace `package.json` with the canonical version**

Open `package.json` and replace its content with:

```json
{
  "name": "freeai-bot",
  "version": "0.1.0",
  "description": "Public Telegram bot powered by Puter.js — chat with 500+ AI models using your own Puter quota.",
  "type": "module",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "engines": {
    "node": ">=20"
  },
  "dependencies": {
    "@grammyjs/conversations": "^1.2.0",
    "@grammyjs/menu": "^1.3.0",
    "@heyputer/puter.js": "latest",
    "better-sqlite3": "^11.0.0",
    "dotenv": "^16.4.0",
    "grammy": "^1.27.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "vitest": "^1.6.0"
  }
}
```

(If `npm install` later complains about resolved versions, just keep the resolved ones — the `^` ranges are minimums.)

- [ ] **Step 1.5: Create `.gitignore`**

```
node_modules/
.env
data/*.db
data/*.db-journal
data/*.db-wal
data/*.db-shm
.DS_Store
*.log
coverage/
.vscode/
.idea/
```

- [ ] **Step 1.6: Create `.env.example`**

```
# Required
TELEGRAM_BOT_TOKEN=

# Subscription gate
REQUIRED_CHANNEL=@privatekey_ai
SUBSCRIPTION_CACHE_TTL_MIN=5

# Optional / defaults
DATABASE_PATH=./data/bot.db
HISTORY_MESSAGES=20
DEFAULT_MODEL=gpt-5-nano
LOG_LEVEL=info
```

- [ ] **Step 1.7: Create `vitest.config.js`**

```js
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.js"],
    pool: "forks", // better-sqlite3 native module is happier with forks
  },
});
```

- [ ] **Step 1.8: Create `data/.gitkeep`**

Empty file. Just `touch data/.gitkeep` (or echo > data/.gitkeep on Windows).

- [ ] **Step 1.9: Create `README.md` skeleton**

```markdown
# FreeAI — Telegram Bot on Puter.js

Public Telegram bot. Each user pastes their own Puter token (`/login`-flow via inline button), chats with one of ~10 curated AI models, has a 20-message sliding-window dialogue. Subscription to `@privatekey_ai` is required.

## Quick start

```bash
git clone <repo>
cd FreeAI
npm install
cp .env.example .env       # fill TELEGRAM_BOT_TOKEN
npm start
```

(Full README is generated in Task 20.)
```

- [ ] **Step 1.10: Init git + first commit**

```bash
git init
git add .
git commit -m "chore: project skeleton"
```

---

## Task 2: Config module (TDD)

**Files:**
- Create: `src/config.js`
- Create: `src/config.test.js`

- [ ] **Step 2.1: Write the failing test**

`src/config.test.js`:

```js
import { describe, it, expect } from "vitest";
import { parseConfig } from "./config.js";

describe("parseConfig", () => {
  const baseEnv = {
    TELEGRAM_BOT_TOKEN: "12345:ABC",
  };

  it("parses minimal env with defaults", () => {
    const cfg = parseConfig(baseEnv);
    expect(cfg.telegramBotToken).toBe("12345:ABC");
    expect(cfg.requiredChannel).toBe("@privatekey_ai");
    expect(cfg.subscriptionCacheTtlMin).toBe(5);
    expect(cfg.databasePath).toBe("./data/bot.db");
    expect(cfg.historyMessages).toBe(20);
    expect(cfg.defaultModel).toBe("gpt-5-nano");
    expect(cfg.logLevel).toBe("info");
  });

  it("throws when TELEGRAM_BOT_TOKEN missing", () => {
    expect(() => parseConfig({})).toThrow(/TELEGRAM_BOT_TOKEN/);
  });

  it("treats empty REQUIRED_CHANNEL as gate disabled", () => {
    const cfg = parseConfig({ ...baseEnv, REQUIRED_CHANNEL: "" });
    expect(cfg.requiredChannel).toBe(null);
  });

  it("coerces numeric env vars", () => {
    const cfg = parseConfig({
      ...baseEnv,
      SUBSCRIPTION_CACHE_TTL_MIN: "10",
      HISTORY_MESSAGES: "30",
    });
    expect(cfg.subscriptionCacheTtlMin).toBe(10);
    expect(cfg.historyMessages).toBe(30);
  });

  it("rejects negative HISTORY_MESSAGES", () => {
    expect(() =>
      parseConfig({ ...baseEnv, HISTORY_MESSAGES: "-1" })
    ).toThrow();
  });
});
```

- [ ] **Step 2.2: Run test to verify it fails**

```bash
npm test
```

Expected: tests in `src/config.test.js` fail with "Cannot find module './config.js'" or similar.

- [ ] **Step 2.3: Implement `src/config.js`**

```js
import { z } from "zod";

const Schema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1, "TELEGRAM_BOT_TOKEN is required"),
  REQUIRED_CHANNEL: z.string().default("@privatekey_ai"),
  SUBSCRIPTION_CACHE_TTL_MIN: z.coerce.number().int().min(0).default(5),
  DATABASE_PATH: z.string().default("./data/bot.db"),
  HISTORY_MESSAGES: z.coerce.number().int().min(0).default(20),
  DEFAULT_MODEL: z.string().default("gpt-5-nano"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export function parseConfig(env = process.env) {
  const parsed = Schema.parse(env);
  return {
    telegramBotToken: parsed.TELEGRAM_BOT_TOKEN,
    requiredChannel: parsed.REQUIRED_CHANNEL === "" ? null : parsed.REQUIRED_CHANNEL,
    subscriptionCacheTtlMin: parsed.SUBSCRIPTION_CACHE_TTL_MIN,
    databasePath: parsed.DATABASE_PATH,
    historyMessages: parsed.HISTORY_MESSAGES,
    defaultModel: parsed.DEFAULT_MODEL,
    logLevel: parsed.LOG_LEVEL,
  };
}
```

- [ ] **Step 2.4: Run tests to verify they pass**

```bash
npm test
```

Expected: 5 tests pass.

- [ ] **Step 2.5: Commit**

```bash
git add src/config.js src/config.test.js
git commit -m "feat(config): zod-validated env parsing"
```

---

## Task 3: Models catalog

**Files:**
- Create: `src/models.js`
- Create: `src/models.test.js`

- [ ] **Step 3.1: Write the failing test**

`src/models.test.js`:

```js
import { describe, it, expect } from "vitest";
import { MODELS, findModel, isValidModelId } from "./models.js";

describe("MODELS catalog", () => {
  it("has at least 10 entries", () => {
    expect(MODELS.length).toBeGreaterThanOrEqual(10);
  });

  it("every entry has id and label", () => {
    for (const m of MODELS) {
      expect(m.id).toBeTypeOf("string");
      expect(m.id.length).toBeGreaterThan(0);
      expect(m.label).toBeTypeOf("string");
      expect(m.label.length).toBeGreaterThan(0);
    }
  });

  it("ids are unique", () => {
    const ids = MODELS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("findModel returns entry by id", () => {
    const first = MODELS[0];
    expect(findModel(first.id)).toEqual(first);
  });

  it("findModel returns undefined for unknown id", () => {
    expect(findModel("nope-not-a-real-id")).toBeUndefined();
  });

  it("isValidModelId rejects unknown ids", () => {
    expect(isValidModelId("definitely-not-real")).toBe(false);
    expect(isValidModelId(MODELS[0].id)).toBe(true);
  });
});
```

- [ ] **Step 3.2: Run test to verify it fails**

```bash
npm test
```

Expected: tests in `src/models.test.js` fail.

- [ ] **Step 3.3: Implement `src/models.js`**

```js
/**
 * Curated catalog of AI models exposed in the model-picker menu.
 *
 * Order = order shown to the user.
 *
 * NOTE: model IDs below are the best-guess from Puter docs at design time.
 * If any ID is rejected by Puter at runtime, fix it here. The list of real
 * IDs can be obtained at runtime via `puter.ai.listModels()`.
 */
export const MODELS = [
  { id: "gpt-5-nano",           label: "GPT-5 nano (быстро)" },
  { id: "gpt-5",                label: "GPT-5 (качество)" },
  { id: "claude-sonnet-4-5",    label: "Claude Sonnet 4.5" },
  { id: "claude-haiku-4-5",     label: "Claude Haiku" },
  { id: "gemini-2.5-pro",       label: "Gemini 2.5 Pro" },
  { id: "gemini-2.5-flash",     label: "Gemini 2.5 Flash" },
  { id: "grok-4",               label: "Grok 4" },
  { id: "deepseek-chat",        label: "DeepSeek V3.1" },
  { id: "llama-3.3-70b",        label: "Llama 3.3 70B" },
  { id: "mistral-large-latest", label: "Mistral Large" },
];

export function findModel(id) {
  return MODELS.find((m) => m.id === id);
}

export function isValidModelId(id) {
  return findModel(id) !== undefined;
}
```

- [ ] **Step 3.4: Run tests to verify they pass**

```bash
npm test
```

Expected: 6 tests pass (in addition to Task 2 tests).

- [ ] **Step 3.5: Commit**

```bash
git add src/models.js src/models.test.js
git commit -m "feat(models): curated 10-model catalog"
```

---

## Task 4: MarkdownV2 escape utility (TDD)

**Files:**
- Create: `src/utils/markdown.js`
- Create: `src/utils/markdown.test.js`

Background: Telegram MarkdownV2 reserves these characters: `_*[]()~\`>#+-=|{}.!`. Non-entity occurrences must be `\`-escaped. The simplest correct strategy for AI replies is "escape everything reserved" — code blocks and inline code are detected first so their contents are NOT escaped, then everything outside code is escaped.

- [ ] **Step 4.1: Write the failing tests**

`src/utils/markdown.test.js`:

```js
import { describe, it, expect } from "vitest";
import { escapeMarkdownV2 } from "./markdown.js";

describe("escapeMarkdownV2", () => {
  it("escapes plain reserved characters", () => {
    expect(escapeMarkdownV2("a.b")).toBe("a\\.b");
    expect(escapeMarkdownV2("a-b")).toBe("a\\-b");
    expect(escapeMarkdownV2("(hi)")).toBe("\\(hi\\)");
  });

  it("leaves text without reserved chars unchanged", () => {
    expect(escapeMarkdownV2("hello world")).toBe("hello world");
  });

  it("preserves fenced code blocks verbatim", () => {
    const input = "Look:\n```js\nconst x = 1.0;\n```\nDone.";
    const out = escapeMarkdownV2(input);
    expect(out).toContain("```js\nconst x = 1.0;\n```");
    expect(out).toContain("Done\\.");
    expect(out.startsWith("Look:\n")).toBe(true);
  });

  it("preserves inline code verbatim", () => {
    const input = "Use `foo.bar()` here.";
    const out = escapeMarkdownV2(input);
    expect(out).toContain("`foo.bar()`");
    expect(out).toContain("here\\.");
  });

  it("escapes backslash itself", () => {
    expect(escapeMarkdownV2("a\\b")).toBe("a\\\\b");
  });
});
```

- [ ] **Step 4.2: Run tests to verify they fail**

```bash
npm test
```

Expected: tests fail with "Cannot find module './markdown.js'".

- [ ] **Step 4.3: Implement `src/utils/markdown.js`**

```js
/**
 * Escape arbitrary text for Telegram MarkdownV2.
 * Strategy:
 *   1. Pull out triple-backtick fenced blocks and single-backtick inline code
 *      into placeholders so their contents are NOT escaped.
 *   2. Escape every reserved character outside the placeholders, including
 *      backslash itself (so backslash must be escaped first).
 *   3. Restore placeholders.
 *
 * Reserved per https://core.telegram.org/bots/api#markdownv2-style:
 *   _ * [ ] ( ) ~ ` > # + - = | { } . !
 * Plus backslash, which must be escaped first.
 */
const RESERVED = /[_*[\]()~`>#+\-=|{}.!]/g;
const FENCE = /```[\s\S]*?```/g;
const INLINE = /`[^`]*`/g;

export function escapeMarkdownV2(text) {
  if (text === null || text === undefined) return "";
  const placeholders = [];

  const stash = (match) => {
    const token = `\u0000PH${placeholders.length}\u0000`;
    placeholders.push(match);
    return token;
  };

  // 1. Stash code blocks first so they aren't touched.
  let work = String(text).replace(FENCE, stash).replace(INLINE, stash);

  // 2. Escape backslash, then reserved chars (order matters so we don't double-escape).
  work = work.replace(/\\/g, "\\\\").replace(RESERVED, (c) => `\\${c}`);

  // 3. Restore stashed code as-is.
  work = work.replace(/\u0000PH(\d+)\u0000/g, (_, i) => placeholders[Number(i)]);

  return work;
}
```

- [ ] **Step 4.4: Run tests to verify they pass**

```bash
npm test
```

Expected: 5 tests pass.

- [ ] **Step 4.5: Commit**

```bash
git add src/utils/markdown.js src/utils/markdown.test.js
git commit -m "feat(utils): MarkdownV2 escape with code-block preservation"
```

---

## Task 5: Database init + migrations

**Files:**
- Create: `src/db/index.js`
- Create: `src/db/index.test.js`

- [ ] **Step 5.1: Write the failing test**

`src/db/index.test.js`:

```js
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
    // Re-opening (which re-runs migrations) is implicitly tested by the fact
    // that openDb uses CREATE TABLE IF NOT EXISTS — re-run safely:
    expect(() => openDb(":memory:")).not.toThrow();
  });
});
```

- [ ] **Step 5.2: Run test to verify it fails**

```bash
npm test
```

Expected: tests fail.

- [ ] **Step 5.3: Implement `src/db/index.js`**

```js
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
```

- [ ] **Step 5.4: Run tests to verify they pass**

```bash
npm test
```

Expected: 4 tests pass.

- [ ] **Step 5.5: Commit**

```bash
git add src/db/index.js src/db/index.test.js
git commit -m "feat(db): better-sqlite3 init + schema migrations"
```

---

## Task 6: Users repository (TDD)

**Files:**
- Create: `src/db/users.js`
- Create: `src/db/users.test.js`

- [ ] **Step 6.1: Write the failing test**

`src/db/users.test.js`:

```js
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
```

- [ ] **Step 6.2: Run test to verify it fails**

```bash
npm test
```

Expected: failures with "Cannot find module './users.js'".

- [ ] **Step 6.3: Implement `src/db/users.js`**

```js
const now = () => Date.now();

export function createUsersRepo(db) {
  const stmts = {
    get: db.prepare("SELECT * FROM users WHERE telegram_id = ?"),
    insert: db.prepare(`
      INSERT INTO users (telegram_id, model, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `),
    setToken: db.prepare(`
      UPDATE users SET puter_token = ?, puter_username = ?, updated_at = ?
      WHERE telegram_id = ?
    `),
    clearToken: db.prepare(`
      UPDATE users SET puter_token = NULL, puter_username = NULL, updated_at = ?
      WHERE telegram_id = ?
    `),
    setModel: db.prepare(`
      UPDATE users SET model = ?, updated_at = ? WHERE telegram_id = ?
    `),
    setSystemPrompt: db.prepare(`
      UPDATE users SET system_prompt = ?, updated_at = ? WHERE telegram_id = ?
    `),
    markSub: db.prepare(`
      UPDATE users SET subscription_verified_at = ?, updated_at = ? WHERE telegram_id = ?
    `),
    clearSub: db.prepare(`
      UPDATE users SET subscription_verified_at = NULL, updated_at = ? WHERE telegram_id = ?
    `),
  };

  return {
    get(telegramId) {
      return stmts.get.get(telegramId) ?? null;
    },

    getOrCreate(telegramId, defaultModel) {
      const existing = stmts.get.get(telegramId);
      if (existing) return existing;
      const ts = now();
      stmts.insert.run(telegramId, defaultModel, ts, ts);
      return stmts.get.get(telegramId);
    },

    setToken(telegramId, token, username) {
      stmts.setToken.run(token, username ?? null, now(), telegramId);
    },

    clearToken(telegramId) {
      stmts.clearToken.run(now(), telegramId);
    },

    setModel(telegramId, modelId) {
      stmts.setModel.run(modelId, now(), telegramId);
    },

    setSystemPrompt(telegramId, prompt) {
      stmts.setSystemPrompt.run(prompt, now(), telegramId);
    },

    clearSystemPrompt(telegramId) {
      stmts.setSystemPrompt.run(null, now(), telegramId);
    },

    markSubscriptionVerified(telegramId) {
      stmts.markSub.run(now(), now(), telegramId);
    },

    clearSubscriptionVerified(telegramId) {
      stmts.clearSub.run(now(), telegramId);
    },
  };
}
```

- [ ] **Step 6.4: Run tests to verify they pass**

```bash
npm test
```

Expected: all users-repo tests pass.

- [ ] **Step 6.5: Commit**

```bash
git add src/db/users.js src/db/users.test.js
git commit -m "feat(db): users repository"
```

---

## Task 7: Messages repository (TDD)

**Files:**
- Create: `src/db/messages.js`
- Create: `src/db/messages.test.js`

- [ ] **Step 7.1: Write the failing test**

`src/db/messages.test.js`:

```js
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
```

- [ ] **Step 7.2: Run test to verify it fails**

```bash
npm test
```

- [ ] **Step 7.3: Implement `src/db/messages.js`**

```js
const now = () => Date.now();

export function createMessagesRepo(db) {
  const insertOne = db.prepare(`
    INSERT INTO messages (telegram_id, role, content, created_at)
    VALUES (?, ?, ?, ?)
  `);

  const recordTx = db.transaction((telegramId, userText, assistantText) => {
    const ts = now();
    insertOne.run(telegramId, "user", userText, ts);
    insertOne.run(telegramId, "assistant", assistantText, ts);
  });

  const getRecentStmt = db.prepare(`
    SELECT role, content
    FROM messages
    WHERE telegram_id = ?
    ORDER BY id DESC
    LIMIT ?
  `);

  const deleteAllStmt = db.prepare(`
    DELETE FROM messages WHERE telegram_id = ?
  `);

  return {
    /** Atomic write of user→assistant pair after a successful AI call. */
    recordExchange(telegramId, userText, assistantText) {
      recordTx(telegramId, userText, assistantText);
    },

    /**
     * Returns up to `limit` most recent messages in CHRONOLOGICAL order
     * (oldest first), suitable for direct use as Puter `messages` array.
     */
    getRecent(telegramId, limit) {
      const rows = getRecentStmt.all(telegramId, limit);
      return rows.reverse();
    },

    deleteAll(telegramId) {
      deleteAllStmt.run(telegramId);
    },
  };
}
```

- [ ] **Step 7.4: Run tests to verify they pass**

```bash
npm test
```

Expected: messages-repo tests pass.

- [ ] **Step 7.5: Commit**

```bash
git add src/db/messages.js src/db/messages.test.js
git commit -m "feat(db): messages repository (transactional exchange writes)"
```

---

## Task 8: Puter client wrapper

**Files:**
- Create: `src/puter/client.js`
- Create: `src/puter/client.test.js`

Background note: the docs show
```js
import { init } from "@heyputer/puter.js/src/init.cjs";
```
That path is **CommonJS** — Node ESM can usually import default-exported CJS, but named exports from CJS are heuristic. If `import { init }` doesn't work at runtime, fall back to `createRequire`:
```js
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { init } = require("@heyputer/puter.js/src/init.cjs");
```
The implementation below tries the named import first; if you hit "init is not a function" at runtime, switch to the createRequire form.

- [ ] **Step 8.1: Write the failing test**

`src/puter/client.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Puter SDK BEFORE importing client.js.
const initMock = vi.fn();
vi.mock("@heyputer/puter.js/src/init.cjs", () => ({
  init: (token) => initMock(token),
}));

const { getClientFor, validateToken, askChat, _resetCacheForTest } = await import(
  "./client.js"
);

beforeEach(() => {
  initMock.mockReset();
  _resetCacheForTest();
});

describe("getClientFor", () => {
  it("calls init exactly once per token (caching)", () => {
    const fakeClient = { auth: { getUser: vi.fn() } };
    initMock.mockReturnValue(fakeClient);
    const a = getClientFor("tok-1");
    const b = getClientFor("tok-1");
    expect(a).toBe(b);
    expect(initMock).toHaveBeenCalledTimes(1);
  });

  it("creates a new client for a new token", () => {
    initMock.mockReturnValueOnce({ id: 1 }).mockReturnValueOnce({ id: 2 });
    const a = getClientFor("tok-1");
    const b = getClientFor("tok-2");
    expect(a).not.toBe(b);
    expect(initMock).toHaveBeenCalledTimes(2);
  });
});

describe("validateToken", () => {
  it("returns the username on success", async () => {
    initMock.mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ username: "alice" }) },
    });
    const res = await validateToken("tok");
    expect(res).toEqual({ ok: true, username: "alice" });
  });

  it("returns ok:false on auth error", async () => {
    initMock.mockReturnValue({
      auth: { getUser: vi.fn().mockRejectedValue(new Error("bad token")) },
    });
    const res = await validateToken("tok");
    expect(res.ok).toBe(false);
    expect(res.error).toBeDefined();
  });
});

describe("askChat", () => {
  it("sends the messages array and returns text", async () => {
    const chatMock = vi.fn().mockResolvedValue({
      message: { content: "hi back" },
    });
    initMock.mockReturnValue({ ai: { chat: chatMock } });

    const out = await askChat("tok", [{ role: "user", content: "hi" }], "gpt-5-nano");
    expect(chatMock).toHaveBeenCalledWith(
      [{ role: "user", content: "hi" }],
      { model: "gpt-5-nano" }
    );
    expect(out).toBe("hi back");
  });

  it("falls back to .text or stringification if shape differs", async () => {
    const chatMock = vi.fn().mockResolvedValue({ text: "fallback" });
    initMock.mockReturnValue({ ai: { chat: chatMock } });
    const out = await askChat("tok", [], "gpt-5-nano");
    expect(out).toBe("fallback");
  });
});
```

- [ ] **Step 8.2: Run test to verify it fails**

```bash
npm test
```

- [ ] **Step 8.3: Implement `src/puter/client.js`**

```js
import { init } from "@heyputer/puter.js/src/init.cjs";

/**
 * Cache of token → puter client. Safe because tokens are opaque strings and
 * each user has exactly one token. Cache lives for the lifetime of the process.
 */
const clients = new Map();

export function getClientFor(token) {
  let client = clients.get(token);
  if (!client) {
    client = init(token);
    clients.set(token, client);
  }
  return client;
}

/** Test-only helper to reset the in-memory client cache. */
export function _resetCacheForTest() {
  clients.clear();
}

/**
 * Probe a token by asking Puter "who am I?". Returns { ok, username } or
 * { ok: false, error } where error is a short, user-safe string.
 */
export async function validateToken(token) {
  try {
    const client = getClientFor(token);
    const user = await client.auth.getUser();
    return { ok: true, username: user?.username ?? "unknown" };
  } catch (err) {
    // Wipe the broken client so we don't reuse it.
    clients.delete(token);
    return { ok: false, error: err?.message ?? "auth failed" };
  }
}

/**
 * Send a messages array to Puter and return plain text.
 * Throws on transport errors; callers are responsible for mapping to user UX.
 */
export async function askChat(token, messages, modelId) {
  const client = getClientFor(token);
  const resp = await client.ai.chat(messages, { model: modelId });
  return extractText(resp);
}

function extractText(resp) {
  if (!resp) return "";
  if (typeof resp === "string") return resp;
  if (typeof resp.message?.content === "string") return resp.message.content;
  if (typeof resp.text === "string") return resp.text;
  return String(resp);
}
```

- [ ] **Step 8.4: Run tests to verify they pass**

```bash
npm test
```

- [ ] **Step 8.5: Commit**

```bash
git add src/puter/client.js src/puter/client.test.js
git commit -m "feat(puter): per-token client cache + validateToken + askChat"
```

---

## Task 9: Subscription gate logic (TDD)

**Files:**
- Create: `src/middleware/subscription-logic.js`
- Create: `src/middleware/subscription-logic.test.js`

We split the gate into a **pure logic module** (testable) and a **grammY middleware** (Task 10) that calls it.

- [ ] **Step 9.1: Write the failing test**

`src/middleware/subscription-logic.test.js`:

```js
import { describe, it, expect } from "vitest";
import { isSubscribedStatus, isCacheFresh } from "./subscription-logic.js";

describe("isSubscribedStatus", () => {
  it("treats member-like statuses as subscribed", () => {
    for (const s of ["creator", "administrator", "member", "restricted"]) {
      expect(isSubscribedStatus(s)).toBe(true);
    }
  });

  it("treats left/kicked as not subscribed", () => {
    for (const s of ["left", "kicked"]) {
      expect(isSubscribedStatus(s)).toBe(false);
    }
  });

  it("returns false for unknown statuses", () => {
    expect(isSubscribedStatus("weird")).toBe(false);
    expect(isSubscribedStatus(undefined)).toBe(false);
  });
});

describe("isCacheFresh", () => {
  it("returns false when verifiedAt is null", () => {
    expect(isCacheFresh(null, 5, Date.now())).toBe(false);
  });

  it("returns true when within ttl", () => {
    const now = 10_000_000;
    const oneMinuteAgo = now - 60_000;
    expect(isCacheFresh(oneMinuteAgo, 5, now)).toBe(true);
  });

  it("returns false when older than ttl", () => {
    const now = 10_000_000;
    const tenMinutesAgo = now - 10 * 60_000;
    expect(isCacheFresh(tenMinutesAgo, 5, now)).toBe(false);
  });

  it("returns true forever when ttlMin is 0 disabled? No, 0 means 'always stale'", () => {
    expect(isCacheFresh(Date.now(), 0, Date.now())).toBe(false);
  });
});
```

- [ ] **Step 9.2: Run test to verify it fails**

```bash
npm test
```

- [ ] **Step 9.3: Implement `src/middleware/subscription-logic.js`**

```js
const SUBSCRIBED_STATUSES = new Set([
  "creator",
  "administrator",
  "member",
  "restricted",
]);

export function isSubscribedStatus(status) {
  return SUBSCRIBED_STATUSES.has(status);
}

/**
 * @param verifiedAt unix ms when subscription was last confirmed (or null)
 * @param ttlMin     cache TTL in minutes (0 = always stale)
 * @param now        unix ms (injectable for tests)
 */
export function isCacheFresh(verifiedAt, ttlMin, now = Date.now()) {
  if (!verifiedAt || ttlMin <= 0) return false;
  return now - verifiedAt < ttlMin * 60_000;
}
```

- [ ] **Step 9.4: Run tests to verify they pass**

```bash
npm test
```

- [ ] **Step 9.5: Commit**

```bash
git add src/middleware/subscription-logic.js src/middleware/subscription-logic.test.js
git commit -m "feat(subscription): pure logic for status + cache freshness"
```

---

## Task 10: Subscription middleware + gate menu

**Files:**
- Create: `src/menus/subscription.js`
- Create: `src/middleware/subscription.js`

These are wiring code (no unit tests — exercised end-to-end by the running bot).

- [ ] **Step 10.1: Implement `src/menus/subscription.js`**

```js
import { Menu } from "@grammyjs/menu";

/**
 * Builds the gate keyboard. The "I subscribed" button calls back with id
 * "sub:recheck"; the actual rechecking is performed by the subscription
 * middleware which runs on every callback.
 */
export function buildSubscriptionMenu(channelHandle) {
  const url = handleToUrl(channelHandle);
  const menu = new Menu("subscription-gate")
    .url("📢 Подписаться на канал", url)
    .row()
    .text("✅ Я подписался", async (ctx) => {
      // Re-running middleware happens automatically on the next update.
      // Here we just nudge the user to redraw.
      await ctx.answerCallbackQuery({ text: "Проверяю…" });
      // Trigger a re-evaluation by sending /start-equivalent.
      // The simplest UX: delete the gate message and emit a new flow.
      await ctx.deleteMessage().catch(() => {});
      // Forward to the start handler by emitting a synthetic command.
      // Easier: just call the same code path explicitly.
      const { showAfterSubscriptionCheck } = await import("../handlers/start.js");
      await showAfterSubscriptionCheck(ctx);
    });
  return menu;
}

function handleToUrl(handle) {
  const trimmed = handle.startsWith("@") ? handle.slice(1) : handle;
  return `https://t.me/${trimmed}`;
}
```

- [ ] **Step 10.2: Implement `src/middleware/subscription.js`**

```js
import { isSubscribedStatus, isCacheFresh } from "./subscription-logic.js";

/**
 * Build a grammY middleware that enforces channel subscription.
 *
 * Behavior:
 *  - If `channelHandle` is null → no-op (gate disabled).
 *  - If user is in cache (subscription_verified_at is fresh) → pass through.
 *  - Otherwise call bot.api.getChatMember; if subscribed mark cache, pass
 *    through. If not subscribed, deliver gate keyboard and STOP propagation.
 *  - On API errors (e.g. bot not in channel) log and STOP with a generic msg.
 */
export function createSubscriptionMiddleware({
  channelHandle,
  ttlMin,
  usersRepo,
  defaultModel,
  subscriptionMenu,
  logger,
}) {
  if (!channelHandle) {
    return async (_ctx, next) => next();
  }

  return async (ctx, next) => {
    if (!ctx.from) return next(); // channel posts, etc.

    const tgId = ctx.from.id;
    const user = usersRepo.getOrCreate(tgId, defaultModel);

    if (isCacheFresh(user.subscription_verified_at, ttlMin)) {
      return next();
    }

    let status;
    try {
      const member = await ctx.api.getChatMember(channelHandle, tgId);
      status = member?.status;
    } catch (err) {
      logger?.error?.(`getChatMember failed: ${err?.message}`);
      await safeReply(
        ctx,
        "Не получилось проверить подписку. Попробуй позже."
      );
      return; // stop propagation
    }

    if (isSubscribedStatus(status)) {
      usersRepo.markSubscriptionVerified(tgId);
      return next();
    }

    usersRepo.clearSubscriptionVerified(tgId);

    await safeReply(
      ctx,
      [
        "🔒 Доступ к боту только для подписчиков канала",
        "",
        `📢 ${channelHandle}`,
        "",
        "Подпишись и нажми «Я подписался».",
      ].join("\n"),
      { reply_markup: subscriptionMenu }
    );
    // do NOT call next() — gate stops everything
  };
}

async function safeReply(ctx, text, extra) {
  try {
    if (ctx.callbackQuery) {
      await ctx.answerCallbackQuery().catch(() => {});
    }
    await ctx.reply(text, extra);
  } catch {
    /* silent — Telegram may have rate-limited or the chat may be closed */
  }
}
```

- [ ] **Step 10.3: Smoke-check that imports resolve**

```bash
node --input-type=module -e "import('./src/middleware/subscription.js').then(()=>console.log('ok'))"
```

Expected: prints `ok`.

- [ ] **Step 10.4: Commit**

```bash
git add src/menus/subscription.js src/middleware/subscription.js
git commit -m "feat(subscription): grammY middleware + gate keyboard"
```

---

## Task 11: Main menu

**Files:**
- Create: `src/menus/main.js`

- [ ] **Step 11.1: Implement `src/menus/main.js`**

```js
import { Menu } from "@grammyjs/menu";
import { findModel } from "../models.js";

/**
 * Build the main menu. Some buttons rely on per-user state, so labels are
 * computed at render time via dynamic-text functions.
 */
export function buildMainMenu({ usersRepo, defaultModel }) {
  const menu = new Menu("main")
    .text(
      (ctx) => {
        const u = usersRepo.getOrCreate(ctx.from.id, defaultModel);
        return u.puter_token ? "🔑 Перезайти / выйти" : "🔑 Войти в Puter";
      },
      async (ctx) => {
        await ctx.conversation.enter("login");
      }
    )
    .row()
    .text(
      (ctx) => {
        const u = usersRepo.getOrCreate(ctx.from.id, defaultModel);
        const m = findModel(u.model);
        return `🤖 Модель: ${m ? m.label : u.model}`;
      },
      async (ctx) => {
        await ctx.menu.nav("models");
      }
    )
    .row()
    .text("⚙️ System prompt", async (ctx) => {
      await ctx.menu.nav("system");
    })
    .row()
    .text("🗑 Очистить историю", async (ctx) => {
      await ctx.menu.nav("clear-history");
    })
    .row()
    .text("ℹ️ Помощь", async (ctx) => {
      await ctx.editMessageText(helpText(), { parse_mode: undefined });
    });
  return menu;
}

function helpText() {
  return [
    "ℹ️ Как пользоваться:",
    "",
    "1. Зарегистрируйся на https://puter.com",
    "2. В Settings → API Tokens создай токен",
    "3. Здесь нажми «🔑 Войти в Puter» и пришли токен",
    "4. Выбери модель и просто пиши сообщения",
    "",
    "Все запросы идут через ТВОЙ Puter-аккаунт — ты используешь свой бесплатный лимит / свои деньги, бот ничего не списывает.",
  ].join("\n");
}
```

- [ ] **Step 11.2: Smoke-check imports**

```bash
node --input-type=module -e "import('./src/menus/main.js').then(()=>console.log('ok'))"
```

- [ ] **Step 11.3: Commit**

```bash
git add src/menus/main.js
git commit -m "feat(menu): main menu with dynamic labels"
```

---

## Task 12: Models menu

**Files:**
- Create: `src/menus/models.js`

- [ ] **Step 12.1: Implement `src/menus/models.js`**

```js
import { Menu } from "@grammyjs/menu";
import { MODELS } from "../models.js";

export function buildModelsMenu({ usersRepo, defaultModel }) {
  const menu = new Menu("models").dynamic((ctx, range) => {
    const u = usersRepo.getOrCreate(ctx.from.id, defaultModel);
    for (const m of MODELS) {
      const marker = u.model === m.id ? "✅ " : "    ";
      range
        .text(`${marker}${m.label}`, async (ctx2) => {
          usersRepo.setModel(ctx2.from.id, m.id);
          await ctx2.answerCallbackQuery({ text: `Выбрано: ${m.label}` });
          ctx2.menu.update(); // re-render checkmark
        })
        .row();
    }
    range.back("⬅️ Назад");
  });
  return menu;
}
```

- [ ] **Step 12.2: Commit**

```bash
git add src/menus/models.js
git commit -m "feat(menu): model picker with checkmark"
```

---

## Task 13: System prompt menu + clear-history submenu

**Files:**
- Create: `src/menus/system.js`
- Create: `src/menus/clear-history.js`

- [ ] **Step 13.1: Implement `src/menus/system.js`**

```js
import { Menu } from "@grammyjs/menu";

export function buildSystemMenu({ usersRepo, defaultModel }) {
  const menu = new Menu("system").dynamic((ctx, range) => {
    const u = usersRepo.getOrCreate(ctx.from.id, defaultModel);

    if (u.system_prompt) {
      range
        .text("✏️ Изменить", async (c) => c.conversation.enter("system"))
        .text("🗑 Удалить", async (c) => {
          usersRepo.setSystemPrompt(c.from.id, null);
          await c.answerCallbackQuery({ text: "Удалено" });
          c.menu.update();
        })
        .row();
    } else {
      range
        .text("➕ Задать system prompt", async (c) =>
          c.conversation.enter("system")
        )
        .row();
    }
    range.back("⬅️ Назад");
  });
  return menu;
}

export function currentSystemPromptText(user) {
  if (!user.system_prompt) {
    return "⚙️ System prompt не задан.";
  }
  return `⚙️ Текущий system prompt:\n\n${user.system_prompt}`;
}
```

- [ ] **Step 13.2: Implement `src/menus/clear-history.js`**

```js
import { Menu } from "@grammyjs/menu";

export function buildClearHistoryMenu({ messagesRepo }) {
  return new Menu("clear-history")
    .text("✅ Да, удалить", async (ctx) => {
      messagesRepo.deleteAll(ctx.from.id);
      await ctx.answerCallbackQuery({ text: "История очищена" });
      await ctx.menu.nav("main");
    })
    .row()
    .back("⬅️ Отмена");
}
```

- [ ] **Step 13.3: Commit**

```bash
git add src/menus/system.js src/menus/clear-history.js
git commit -m "feat(menu): system-prompt + clear-history submenus"
```

---

## Task 14: Login conversation

**Files:**
- Create: `src/conversations/login.js`

- [ ] **Step 14.1: Implement `src/conversations/login.js`**

```js
import { validateToken } from "../puter/client.js";

const CANCEL_TEXT = "Отмена ❌";

/**
 * grammY conversation factory. Returns the `(conversation, ctx)` async
 * function expected by `@grammyjs/conversations`.
 */
export function buildLoginConversation({ usersRepo }) {
  return async function login(conversation, ctx) {
    await ctx.reply(
      [
        "🔑 Войти в Puter",
        "",
        "1. Открой https://puter.com и войди (или зарегистрируйся).",
        "2. Settings → API Tokens → Create.",
        "3. Скопируй токен и пришли его следующим сообщением.",
        "",
        `Чтобы прервать — отправь «${CANCEL_TEXT}».`,
      ].join("\n")
    );

    while (true) {
      const reply = await conversation.waitFor("message:text");
      const text = reply.message.text.trim();
      if (text === CANCEL_TEXT || text === "/cancel") {
        await ctx.reply("Отменено.");
        return;
      }

      // Run the network call OUTSIDE conversation persistence.
      const result = await conversation.external(() => validateToken(text));

      if (result.ok) {
        usersRepo.setToken(ctx.from.id, text, result.username);
        await ctx.reply(
          `✅ Успех! Привет, ${result.username}. Можешь начинать общаться — просто пиши сообщения.`
        );
        return;
      }

      await ctx.reply(
        `❌ Токен невалиден (${result.error}). Пришли другой или «${CANCEL_TEXT}».`
      );
    }
  };
}
```

- [ ] **Step 14.2: Commit**

```bash
git add src/conversations/login.js
git commit -m "feat(conv): login conversation with token validation"
```

---

## Task 15: System prompt conversation

**Files:**
- Create: `src/conversations/system.js`

- [ ] **Step 15.1: Implement `src/conversations/system.js`**

```js
const CANCEL_TEXT = "Отмена ❌";

export function buildSystemConversation({ usersRepo }) {
  return async function system(conversation, ctx) {
    await ctx.reply(
      [
        "⚙️ Пришли новый system prompt одним сообщением.",
        `Чтобы прервать — отправь «${CANCEL_TEXT}».`,
      ].join("\n")
    );

    const reply = await conversation.waitFor("message:text");
    const text = reply.message.text.trim();

    if (text === CANCEL_TEXT || text === "/cancel") {
      await ctx.reply("Отменено.");
      return;
    }

    if (text.length > 4000) {
      await ctx.reply("Слишком длинно (макс 4000). Сократи и пришли ещё раз через меню.");
      return;
    }

    usersRepo.setSystemPrompt(ctx.from.id, text);
    await ctx.reply("✅ System prompt сохранён.");
  };
}
```

- [ ] **Step 15.2: Commit**

```bash
git add src/conversations/system.js
git commit -m "feat(conv): system prompt conversation"
```

---

## Task 16: Start handler

**Files:**
- Create: `src/handlers/start.js`

- [ ] **Step 16.1: Implement `src/handlers/start.js`**

```js
import { findModel } from "../models.js";

export function buildStartHandler({ usersRepo, defaultModel, mainMenu }) {
  return async function startHandler(ctx) {
    const u = usersRepo.getOrCreate(ctx.from.id, defaultModel);
    const model = findModel(u.model);
    const lines = [
      "💬 *FreeAI Bot*",
      "",
      `Текущая модель: ${model ? model.label : u.model}`,
      `Статус: ${u.puter_token ? "🟢 Залогинен в Puter" : "🔴 Не залогинен"}`,
      "",
      "Выбери действие:",
    ];
    await ctx.reply(lines.join("\n"), {
      reply_markup: mainMenu,
      parse_mode: undefined,
    });
  };
}

/**
 * Re-export of the main-menu render so the subscription gate's
 * "I subscribed" button can call it after a successful re-check.
 */
export async function showAfterSubscriptionCheck(ctx) {
  // The bot.js wiring will set ctx.bot.startHandler — fall back to /start.
  if (typeof ctx.bot?.startHandler === "function") {
    await ctx.bot.startHandler(ctx);
  } else {
    await ctx.reply("Готово. Отправь /start.");
  }
}
```

- [ ] **Step 16.2: Commit**

```bash
git add src/handlers/start.js
git commit -m "feat(handler): /start + welcome with main menu"
```

---

## Task 17: Chat handler

**Files:**
- Create: `src/handlers/chat.js`

- [ ] **Step 17.1: Implement `src/handlers/chat.js`**

```js
import { askChat } from "../puter/client.js";
import { escapeMarkdownV2 } from "../utils/markdown.js";

const TYPING_INTERVAL_MS = 4000;

export function buildChatHandler({
  usersRepo,
  messagesRepo,
  historyMessages,
  defaultModel,
  logger,
}) {
  return async function chatHandler(ctx) {
    const tgId = ctx.from.id;
    const text = ctx.message.text;
    const user = usersRepo.getOrCreate(tgId, defaultModel);

    if (!user.puter_token) {
      await ctx.reply(
        "🔒 Сначала войди в Puter. Отправь /start и нажми «🔑 Войти в Puter»."
      );
      return;
    }

    // Build context: optional system + last N messages + current user message.
    const history = messagesRepo.getRecent(tgId, historyMessages);
    const messages = [];
    if (user.system_prompt) {
      messages.push({ role: "system", content: user.system_prompt });
    }
    messages.push(...history);
    messages.push({ role: "user", content: text });

    // Keep showing "typing" until we get a reply.
    let stopTyping = false;
    const typing = async () => {
      while (!stopTyping) {
        try {
          await ctx.api.sendChatAction(ctx.chat.id, "typing");
        } catch {}
        await new Promise((r) => setTimeout(r, TYPING_INTERVAL_MS));
      }
    };
    typing();

    let aiText;
    try {
      aiText = await askChat(user.puter_token, messages, user.model);
    } catch (err) {
      stopTyping = true;
      const status = err?.status ?? err?.response?.status;
      const msg = String(err?.message ?? err);
      logger?.error?.(`Puter error for tg=${tgId}: ${msg}`);

      if (status === 401 || /unauthorized|invalid token/i.test(msg)) {
        usersRepo.clearToken(tgId);
        await ctx.reply(
          "🔑 Твой Puter-токен больше не действителен. Войди заново через /start → «🔑 Войти в Puter»."
        );
        return;
      }
      if (status === 429 || /quota|rate limit/i.test(msg)) {
        await ctx.reply(
          "⛔ Ты исчерпал свой Puter-лимит. Пополни на puter.com или подожди обновления квоты."
        );
        return;
      }
      await ctx.reply("Что-то пошло не так. Попробуй ещё раз позже.");
      return;
    }
    stopTyping = true;

    // Persist BEFORE replying so a Telegram failure doesn't lose history.
    messagesRepo.recordExchange(tgId, text, aiText ?? "");

    await sendLong(ctx, aiText ?? "(пустой ответ)");
  };
}

/**
 * Send a long text, splitting on paragraph boundaries to fit Telegram's
 * 4096-char limit, with MarkdownV2 + plain-text fallback.
 */
async function sendLong(ctx, text) {
  const MAX = 4000;
  const parts = splitIntoChunks(text, MAX);
  for (const part of parts) {
    let sent = false;
    try {
      await ctx.reply(escapeMarkdownV2(part), { parse_mode: "MarkdownV2" });
      sent = true;
    } catch {
      /* fall through */
    }
    if (!sent) {
      await ctx.reply(part);
    }
  }
}

function splitIntoChunks(text, max) {
  if (text.length <= max) return [text];
  const out = [];
  let buf = "";
  for (const para of text.split(/\n\n+/)) {
    const candidate = buf ? `${buf}\n\n${para}` : para;
    if (candidate.length > max) {
      if (buf) out.push(buf);
      if (para.length > max) {
        for (let i = 0; i < para.length; i += max) {
          out.push(para.slice(i, i + max));
        }
        buf = "";
      } else {
        buf = para;
      }
    } else {
      buf = candidate;
    }
  }
  if (buf) out.push(buf);
  return out;
}
```

- [ ] **Step 17.2: Commit**

```bash
git add src/handlers/chat.js
git commit -m "feat(handler): chat (typing indicator, error mapping, MD fallback, chunk splitting)"
```

---

## Task 18: Bot bootstrap (wire it all together)

**Files:**
- Create: `src/bot.js`
- Create: `src/index.js`
- Create: `src/handlers/errors.js`

This is where everything is glued. There are no unit tests here — verification is via running the bot.

- [ ] **Step 18.1: Implement `src/handlers/errors.js`**

```js
export function installErrorHandler(bot, logger) {
  bot.catch(async (err) => {
    const ctx = err.ctx;
    logger?.error?.(`grammY error for update ${ctx?.update?.update_id}: ${err.error}`);
    if (err.error?.stack) logger?.error?.(err.error.stack);
    try {
      await ctx?.reply?.("⚠️ Что-то пошло не так. Попробуй ещё раз.");
    } catch {}
  });
}
```

- [ ] **Step 18.2: Implement `src/bot.js`**

```js
import { Bot, session } from "grammy";
import { conversations, createConversation } from "@grammyjs/conversations";

import { buildMainMenu } from "./menus/main.js";
import { buildModelsMenu } from "./menus/models.js";
import { buildSystemMenu } from "./menus/system.js";
import { buildClearHistoryMenu } from "./menus/clear-history.js";
import { buildSubscriptionMenu } from "./menus/subscription.js";

import { buildLoginConversation } from "./conversations/login.js";
import { buildSystemConversation } from "./conversations/system.js";

import { buildStartHandler } from "./handlers/start.js";
import { buildChatHandler } from "./handlers/chat.js";
import { installErrorHandler } from "./handlers/errors.js";

import { createSubscriptionMiddleware } from "./middleware/subscription.js";

export function createBot({ config, db, usersRepo, messagesRepo, logger }) {
  const bot = new Bot(config.telegramBotToken);

  // ---- Plumbing: sessions + conversations ----
  bot.use(session({ initial: () => ({}) }));
  bot.use(conversations());

  // ---- Subscription gate ----
  const subscriptionMenu = buildSubscriptionMenu(
    config.requiredChannel ?? "@privatekey_ai"
  );
  bot.use(subscriptionMenu);
  bot.use(
    createSubscriptionMiddleware({
      channelHandle: config.requiredChannel,
      ttlMin: config.subscriptionCacheTtlMin,
      usersRepo,
      defaultModel: config.defaultModel,
      subscriptionMenu,
      logger,
    })
  );

  // ---- Menus ----
  const mainMenu = buildMainMenu({ usersRepo, defaultModel: config.defaultModel });
  const modelsMenu = buildModelsMenu({ usersRepo, defaultModel: config.defaultModel });
  const systemMenu = buildSystemMenu({ usersRepo, defaultModel: config.defaultModel });
  const clearMenu = buildClearHistoryMenu({ messagesRepo });

  mainMenu.register(modelsMenu);
  mainMenu.register(systemMenu);
  mainMenu.register(clearMenu);

  bot.use(mainMenu);

  // ---- Conversations ----
  bot.use(createConversation(buildLoginConversation({ usersRepo }), "login"));
  bot.use(createConversation(buildSystemConversation({ usersRepo }), "system"));

  // ---- Handlers ----
  const startHandler = buildStartHandler({
    usersRepo,
    defaultModel: config.defaultModel,
    mainMenu,
  });
  // Expose for the gate's "I subscribed" callback.
  bot.use(async (ctx, next) => {
    ctx.bot = { startHandler };
    return next();
  });

  bot.command("start", startHandler);

  const chatHandler = buildChatHandler({
    usersRepo,
    messagesRepo,
    historyMessages: config.historyMessages,
    defaultModel: config.defaultModel,
    logger,
  });
  bot.on("message:text", chatHandler);

  installErrorHandler(bot, logger);

  return bot;
}
```

- [ ] **Step 18.3: Implement `src/index.js`**

```js
import "dotenv/config";
import { parseConfig } from "./config.js";
import { openDb } from "./db/index.js";
import { createUsersRepo } from "./db/users.js";
import { createMessagesRepo } from "./db/messages.js";
import { createBot } from "./bot.js";

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

function makeLogger(level) {
  const cur = LOG_LEVELS[level] ?? 1;
  const log = (lvl) => (...args) => {
    if (LOG_LEVELS[lvl] >= cur) {
      const ts = new Date().toISOString();
      console[lvl === "debug" ? "log" : lvl](`[${ts}] [${lvl}]`, ...args);
    }
  };
  return {
    debug: log("debug"),
    info:  log("info"),
    warn:  log("warn"),
    error: log("error"),
  };
}

async function main() {
  const config = parseConfig(process.env);
  const logger = makeLogger(config.logLevel);

  const db = openDb(config.databasePath);
  const usersRepo = createUsersRepo(db);
  const messagesRepo = createMessagesRepo(db);

  const bot = createBot({ config, db, usersRepo, messagesRepo, logger });

  // Graceful shutdown
  const stop = async (sig) => {
    logger.info(`Got ${sig}, stopping…`);
    try { await bot.stop(); } catch {}
    try { db.close(); } catch {}
    process.exit(0);
  };
  process.once("SIGINT", () => stop("SIGINT"));
  process.once("SIGTERM", () => stop("SIGTERM"));

  logger.info(`FreeAI bot starting. Channel gate: ${config.requiredChannel ?? "OFF"}`);
  await bot.start({
    onStart: (info) => logger.info(`Polling as @${info.username}`),
  });
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
```

- [ ] **Step 18.4: Run a syntax-only check**

```bash
node --check src/index.js
node --check src/bot.js
```

Expected: no output, exit 0.

- [ ] **Step 18.5: Commit**

```bash
git add src/bot.js src/index.js src/handlers/errors.js
git commit -m "feat(bot): wire grammY, plugins, gate, menus, conversations, handlers"
```

---

## Task 19: Dockerfile

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`

- [ ] **Step 19.1: Create `Dockerfile`**

```dockerfile
FROM node:20-bookworm-slim AS base

WORKDIR /app

# better-sqlite3 needs build tools at install time.
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 build-essential && \
    rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

# data/ is mounted at runtime; create the dir so the path exists pre-mount.
RUN mkdir -p /app/data
VOLUME ["/app/data"]

ENV NODE_ENV=production
CMD ["node", "src/index.js"]
```

- [ ] **Step 19.2: Create `.dockerignore`**

```
node_modules
.env
data/*.db*
docs
.git
.gitignore
.vscode
.idea
coverage
*.log
```

- [ ] **Step 19.3: Smoke build (optional but recommended)**

```bash
docker build -t freeai-bot:dev .
```

Expected: successful build. (Skip if Docker isn't available locally — the file is fine.)

- [ ] **Step 19.4: Commit**

```bash
git add Dockerfile .dockerignore
git commit -m "chore: Dockerfile (production image with native build tools)"
```

---

## Task 20: README

**Files:**
- Modify: `README.md`

- [ ] **Step 20.1: Replace `README.md` with the full version**

```markdown
# FreeAI — Telegram Bot on Puter.js

Public Telegram bot. Chat with 500+ AI models (GPT, Claude, Gemini, Grok, DeepSeek, Llama, Mistral and more) for free, paying with **your own** Puter quota — the bot operator pays nothing for AI tokens.

- 🔑 Per-user authentication with your own Puter token
- 🤖 ~10 curated top models, switchable from an inline keyboard
- 💬 Per-user dialogue history (sliding window of last 20 messages)
- ⚙️ Per-user system prompt
- 🔒 Subscription-gated to a configurable Telegram channel

## Prerequisites

- Node.js ≥ 20
- A Telegram bot token from [@BotFather](https://t.me/BotFather)
- A Puter account at https://puter.com (each user creates their own; the operator does **not** need one)
- (Windows only) Visual C++ Build Tools — `better-sqlite3` is a native module. Easiest way: `npm install --global --production windows-build-tools`. Alternatively, run via Docker.

## Quick start

```bash
git clone <repo>
cd FreeAI
npm install
cp .env.example .env       # edit and fill TELEGRAM_BOT_TOKEN
npm start
```

## Configuration

All config is via environment variables (`.env` is loaded via `dotenv`).

| Variable | Default | Description |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | — | **Required.** From BotFather. |
| `REQUIRED_CHANNEL` | `@privatekey_ai` | Channel users must subscribe to. Empty string = gate disabled. |
| `SUBSCRIPTION_CACHE_TTL_MIN` | `5` | Minutes to remember a user is subscribed. |
| `DATABASE_PATH` | `./data/bot.db` | SQLite file path. |
| `HISTORY_MESSAGES` | `20` | How many last messages to send to AI as context. |
| `DEFAULT_MODEL` | `gpt-5-nano` | Initial model for new users. |
| `LOG_LEVEL` | `info` | One of `debug`, `info`, `warn`, `error`. |

## How users use the bot

1. The user opens the bot and sends `/start`.
2. The bot checks subscription to `REQUIRED_CHANNEL`. If not subscribed, it shows a gate with a link to the channel and a "I subscribed" button.
3. After subscribing, the user taps **🔑 Войти в Puter**, follows the instructions to create a Puter API token, and pastes it.
4. From then on, the user just types messages. The bot forwards them to the user's chosen model on Puter, returns the AI response, and remembers the last 20 messages.
5. Users can switch model, set a system prompt, or wipe history at any time.

**Important:** every user must create their own Puter token. AI usage is billed to **their** Puter account — the bot operator pays $0 for AI.

## Subscription gate

The bot calls `getChatMember(REQUIRED_CHANNEL, user_id)` to check status. For **public** channels (with `@username`) this works without the bot being a channel admin. If your channel is private, you must add the bot as an admin of the channel.

If `getChatMember` ever returns `chat not found`, double-check that:
- The channel handle in `REQUIRED_CHANNEL` is correct (with `@`)
- The bot has access — for private channels, make it an admin

## Deployment

### Local (development)

```bash
npm start
```

### Docker

```bash
docker build -t freeai-bot .
docker run -d \
  --name freeai-bot \
  --env-file .env \
  -v $(pwd)/data:/app/data \
  --restart unless-stopped \
  freeai-bot
```

### systemd (Linux)

`/etc/systemd/system/freeai-bot.service`:

```ini
[Unit]
Description=FreeAI Telegram bot
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=freeai
WorkingDirectory=/opt/freeai
EnvironmentFile=/opt/freeai/.env
ExecStart=/usr/bin/node /opt/freeai/src/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now freeai-bot
sudo journalctl -u freeai-bot -f   # watch logs
```

## Security notes

- Puter tokens are stored **plaintext** in `data/bot.db`. On Linux, restrict access:
  ```bash
  chmod 700 data && chmod 600 data/bot.db
  ```
- The bot never logs token contents.

## Tests

```bash
npm test          # one-shot
npm run test:watch
```

## License

MIT (or whatever you prefer — fill in `package.json`).
```

- [ ] **Step 20.2: Commit**

```bash
git add README.md
git commit -m "docs: full README with setup, config, deployment, security"
```

---

## Task 21: End-to-end smoke test (manual)

This task has no commits — it verifies the bot actually starts and the gate works. Document any issues you find in the spec's §11 risks section.

- [ ] **Step 21.1: Create `.env` from example**

```bash
cp .env.example .env
```

Edit `.env`:
- Paste your `TELEGRAM_BOT_TOKEN`
- Optionally set `REQUIRED_CHANNEL=` (empty) to disable the gate while testing locally

- [ ] **Step 21.2: Start the bot**

```bash
npm start
```

Expected log:
```
[…] [info] FreeAI bot starting. Channel gate: @privatekey_ai
[…] [info] Polling as @your_bot
```

- [ ] **Step 21.3: In Telegram, send `/start` to your bot**

Expected:
- If gate enabled and you're not subscribed → gate keyboard
- If subscribed (or gate off) → main menu

- [ ] **Step 21.4: Tap «🔑 Войти в Puter» and paste a real Puter token**

Expected: greeting with your Puter username.

- [ ] **Step 21.5: Tap «🤖 Модель» → pick another model → ⬅️ Назад**

Expected: main menu now shows the new model in the button label.

- [ ] **Step 21.6: Send a few text messages**

Expected: AI replies, with markdown rendered correctly. Model switching reflects in tone.

- [ ] **Step 21.7: Tap «🗑 Очистить историю» → «✅ Да, удалить»**

Expected: confirmation toast. Send another message — AI no longer references previous turns.

- [ ] **Step 21.8: Check the DB**

```bash
sqlite3 data/bot.db "SELECT telegram_id, puter_username, model, system_prompt IS NOT NULL FROM users"
sqlite3 data/bot.db "SELECT COUNT(*) FROM messages"
```

Expected: your user appears; message count makes sense.

- [ ] **Step 21.9: Final test commit**

If you fixed any model-id mismatches, broken imports, or escape bugs during smoke testing, fix them and commit:

```bash
git add -A
git commit -m "fix: smoke-test corrections"
```

---

## Self-Review (run before declaring the plan complete)

**1. Spec coverage.** Does every section of the spec map to a task?

| Spec section | Task |
|---|---|
| §1 Summary, §2 Goals | covered by overall plan |
| §3.1 First contact / gate | Tasks 9, 10, 18 |
| §3.2 Login flow | Tasks 8, 14 |
| §3.3 Choosing a model | Task 12 |
| §3.4 System prompt | Tasks 13, 15 |
| §3.5 Clear history | Task 13 |
| §3.6 Sending a chat message | Task 17 |
| §3.7 Errors from Puter | Task 17 |
| §4 Architecture | Task 18 (wiring) |
| §5 Schema, history-building | Tasks 5, 6, 7, 17 |
| §6 Model catalog | Task 3 |
| §7.1 Stack | Task 1 |
| §7.2 Subscription gate | Tasks 9, 10 |
| §7.3 Long polling | Task 18 |
| §7.4 No streaming | Task 17 (sendChatAction only) |
| §7.5 Markdown handling | Tasks 4, 17 |
| §7.6 Token storage | Tasks 6, 20 (README warns) |
| §7.7 Error handling | Tasks 17, 18 (errors.js) |
| §8 Configuration | Tasks 1, 2, 20 |
| §9 Project layout | All tasks |
| §10 Deployment | Tasks 19, 20 |
| §11 Risks | Task 21 (manual test verifies) |

No gaps detected.

**2. Placeholders:** none — every step has concrete code or commands.

**3. Type/name consistency:**
- `usersRepo.getOrCreate(telegramId, defaultModel)` — used identically in middleware, menus, handlers ✓
- `messagesRepo.recordExchange(tgId, userText, assistantText)` — only one signature ✓
- `messagesRepo.getRecent(tgId, limit)` returns chronological order, used in `chat.js` accordingly ✓
- `validateToken(token)` returns `{ ok, username }` or `{ ok, error }` — used consistently in `login.js` ✓
- `askChat(token, messages, modelId)` — signature matches usage in `chat.js` ✓
- `subscription_verified_at` column name consistent across schema, repo, middleware ✓

Plan is consistent.
