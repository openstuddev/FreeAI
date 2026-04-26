# FreeAI — Telegram Bot on Puter.js

**Date:** 2026-04-26
**Status:** Approved
**Author:** brainstorming session

## 1. Summary

A public Telegram bot that lets any user chat with 500+ AI models (GPT, Claude, Gemini, Grok, DeepSeek, Llama, Mistral and others) through [Puter.js](https://developer.puter.com).

Each Telegram user authenticates with their **own** Puter account by pasting an auth token, so all AI usage is billed to the user's own Puter quota — the bot owner pays nothing for AI tokens.

A persistent per-user dialogue (sliding window of the last 20 messages) is keyed by `telegram_user_id`. Model selection, system prompt, and login are exposed entirely through inline-keyboard menus; there are no slash-command-only flows.

Access to the bot is gated by mandatory subscription to the Telegram channel **[@privatekey_ai](https://t.me/privatekey_ai)**.

## 2. Goals & Non-Goals

### Goals
- Anyone on Telegram (subscribed to the channel) can chat with AI models for free, paying only with their own Puter quota.
- Per-user persistent dialogue history (sliding window).
- User-selectable model from a curated list of ~10 popular models.
- Per-user configurable system prompt.
- 100% of UX flows reachable through inline-keyboard buttons (no command-line UX required from users).
- Universal deployment: runs on Windows locally, Linux VPS, or Docker. Configuration via `.env`.

### Non-Goals (v1)
- Streaming responses (Telegram's edit rate-limit makes this awkward; can be added later).
- Per-user rate-limiting (users self-limit via their own Puter quota).
- Image generation (`txt2img`), TTS, STT, OCR (Puter supports these — out of scope for v1).
- Function calling / tool use.
- Multi-language UI (Russian-only for now).
- Webhooks (we use long polling — no public HTTPS needed).
- Token encryption at rest (file-system permissions are the protection).

## 3. User Flows

### 3.1 First contact
1. User opens the bot, taps **Start**.
2. Bot checks subscription to `@privatekey_ai` via `getChatMember`.
3. **If not subscribed** → "Subscription Gate" keyboard is shown:
   - URL button "📢 Подписаться на канал" → `https://t.me/privatekey_ai`
   - Callback button "✅ Я подписался" → re-runs the check
4. **If subscribed** → main menu is shown.

### 3.2 Login flow (Puter auth token)
1. User taps **🔑 Войти в Puter** in the main menu.
2. Bot enters a `conversation` (grammY plugin) and replies:
   > Перейди на https://puter.com → войди → Settings → API Tokens → Create.
   > Пришли token следующим сообщением.
   > [❌ Отмена]
3. User pastes the token.
4. Bot validates by calling `puter.auth.getUser()` with that token.
   - Success → save `puter_token` and `puter_username` for `telegram_id`. Reply: "✅ Привет, *username*!" Show main menu.
   - Failure → "Токен невалиден, попробуй ещё раз" + cancel button. Loop.
5. User can tap **❌ Отмена** at any step → conversation aborted, main menu redrawn.

### 3.3 Choosing a model
1. User taps **🤖 Выбрать модель** in main menu.
2. Inline keyboard with the curated list (see §6) is shown. Currently selected model is marked with `✅`.
3. User taps any model → `users.model` is updated, success toast shown, menu redrawn.
4. User taps **⬅️ Назад** → main menu.

### 3.4 Setting a system prompt
1. User taps **⚙️ System prompt**.
2. If a prompt is already set, bot shows it with options **✏️ Изменить** / **🗑 Удалить** / **⬅️ Назад**.
3. **✏️ Изменить** enters a `conversation`: "Пришли новый system prompt одним сообщением." User sends text → saved → menu redrawn.

### 3.5 Clearing history
1. User taps **🗑 Очистить историю** in main menu.
2. Confirmation: "Точно удалить всю историю диалога? [Да] [Отмена]"
3. **Да** → `DELETE FROM messages WHERE telegram_id = ?`. Toast "Готово". Main menu redrawn.

### 3.6 Sending a chat message
1. User sends any plain-text message (not a callback or command).
2. Subscription middleware verifies (cached if recently checked).
3. If `puter_token` is NULL → bot replies "Сначала войди в Puter (🔑)" + main menu. Stop.
4. Otherwise:
   - Build the `messages` array from the existing history (see §5).
   - Call `puter.ai.chat(messages, { model: users.model })` using the user's token.
   - While waiting, send `bot.api.sendChatAction(chat_id, 'typing')` periodically.
   - **On success:** insert both the user message and the AI reply into `messages` in a single transaction, then deliver the reply (MarkdownV2 — see §7.5).
   - **On failure:** nothing is written to `messages` (no orphan user rows). See §3.7 for error UX.

### 3.7 Errors from Puter
- HTTP 401 / "invalid token" → reply "Твой Puter token больше не действителен. Войди заново 🔑". Clear `puter_token` in DB.
- HTTP 429 (quota exceeded) → reply "Ты исчерпал свой Puter лимит. Пополни на puter.com или подожди." Don't clear token.
- Any other error → reply "Что-то пошло не так. Попробуй ещё раз." + log the error.

## 4. Architecture

```
┌──────────────────────────────────────────────────────────┐
│                  Telegram Update                          │
│       (text message / callback_query от кнопки)           │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │  grammY Bot          │
            │  (long polling)      │
            └──────┬───────────────┘
                   │
                   ▼
            ┌──────────────────────┐
            │  Session Plugin      │  per-user state in memory
            └──────┬───────────────┘
                   │
                   ▼
            ┌──────────────────────┐
            │  Subscription        │  gate: getChatMember(@privatekey_ai)
            │  Middleware          │  if not subscribed → gate keyboard, stop
            └──────┬───────────────┘
                   │ (subscribed only)
                   ▼
        ┌──────────┴────────────┬─────────────┐
        ▼                       ▼             ▼
   ┌─────────┐           ┌──────────┐    ┌───────────┐
   │  Menu   │           │Conversa- │    │  Chat     │
   │ Plugin  │           │ tions    │    │ Handler   │
   └────┬────┘           └────┬─────┘    └─────┬─────┘
        │                     │                │
        └─────────────┬───────┴────────────────┘
                      ▼
            ┌──────────────────────┐
            │   Domain Layer       │
            └──────┬───────────────┘
                   │
       ┌───────────┼───────────────┐
       ▼           ▼               ▼
   ┌────────┐ ┌─────────┐    ┌──────────┐
   │SQLite  │ │ Puter   │    │ Models   │
   │(users, │ │ Client  │    │ Catalog  │
   │ msgs)  │ │ per-user│    │ (static) │
   └────────┘ └─────────┘    └──────────┘
```

### Module boundaries
Each unit has one responsibility, communicates through a narrow interface, and is independently understandable & testable.

| Module | Responsibility | Depends on |
|---|---|---|
| `src/index.js` | Entry: load `.env`, run migrations, start bot | `config`, `db`, `bot` |
| `src/config.js` | Parse + validate `.env` (zod) | — |
| `src/bot.js` | Wire up grammY, plugins, middleware, handlers | everything below |
| `src/db/index.js` | Open SQLite, run migrations | `better-sqlite3` |
| `src/db/users.js` | CRUD for `users` table | `db/index` |
| `src/db/messages.js` | CRUD for `messages` table | `db/index` |
| `src/puter/client.js` | Build a Puter client from a token, with light caching | `@heyputer/puter.js` |
| `src/middleware/subscription.js` | Subscription gate | `db/users`, `menus/subscription` |
| `src/menus/main.js` | Main menu definition | `db/users`, `models` |
| `src/menus/models.js` | Model selection menu | `db/users`, `models` |
| `src/menus/system.js` | System prompt menu | `db/users` |
| `src/menus/subscription.js` | Subscription gate keyboard | — |
| `src/conversations/login.js` | Multi-step token entry | `db/users`, `puter/client` |
| `src/conversations/system.js` | Multi-step system prompt entry | `db/users` |
| `src/handlers/chat.js` | Plain-text → AI reply | `db/*`, `puter/client`, `utils/markdown` |
| `src/handlers/errors.js` | Global error logger | — |
| `src/models.js` | Static catalog of curated models | — |
| `src/utils/markdown.js` | Escape AI text for Telegram MarkdownV2 | — |

## 5. Data Model

### SQLite schema (`data/bot.db`)

```sql
CREATE TABLE IF NOT EXISTS users (
  telegram_id              INTEGER PRIMARY KEY,
  puter_token              TEXT,                    -- NULL = not logged in
  puter_username           TEXT,                    -- displayed in greeting
  model                    TEXT NOT NULL DEFAULT 'gpt-5-nano',
  system_prompt            TEXT,                    -- NULL = no system prompt
  subscription_verified_at INTEGER,                 -- unix ts; NULL or stale = recheck
  created_at               INTEGER NOT NULL,
  updated_at               INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id INTEGER NOT NULL,
  role        TEXT NOT NULL,                        -- 'user' | 'assistant'
  content     TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  FOREIGN KEY (telegram_id) REFERENCES users(telegram_id)
);

CREATE INDEX IF NOT EXISTS idx_messages_user
  ON messages(telegram_id, id DESC);
```

### Building the chat context for Puter

```
1. Optionally prepend { role: 'system', content: users.system_prompt }
2. Append last N messages from `messages` table
   (SELECT role, content FROM messages
    WHERE telegram_id = ?
    ORDER BY id DESC
    LIMIT 20
    -- then reverse in code so the oldest is first)
3. Append current user message: { role: 'user', content: incoming_text }
4. Call puter.ai.chat(messages, { model: users.model })
5. INSERT both the user message and the AI reply into `messages`
```

`N = 20` is configurable via `HISTORY_MESSAGES` env var (default 20).
The user's NEW message is **not** stored before sending — it's stored only after a successful AI response, alongside the assistant message, in a single transaction. This prevents orphan user messages on Puter errors.

## 6. Curated Model Catalog

`src/models.js` exports an ordered array. Order is the order shown in the menu.

| label (button) | id (Puter model) | notes |
|---|---|---|
| GPT-5 nano (быстро) | `gpt-5-nano` | default |
| GPT-5 (качество) | `gpt-5` | |
| Claude Sonnet 4.5 | `claude-sonnet-4-5` | |
| Claude Haiku | `claude-haiku-4-5` | |
| Gemini 2.5 Pro | `gemini-2.5-pro` | |
| Gemini 2.5 Flash | `gemini-2.5-flash` | |
| Grok 4 | `grok-4` | |
| DeepSeek V3.1 | `deepseek-chat` | |
| Llama 3.3 70B | `llama-3.3-70b` | |
| Mistral Large | `mistral-large-latest` | |

The exact model identifiers will be verified against `puter.ai.listModels()` during implementation. If any of the IDs above is wrong, it's a one-line fix in this file.

## 7. Technical Decisions

### 7.1 Stack
- **Node.js** (≥ 20, ESM modules, no TypeScript) — keeps the project zero-build, easy to clone & run.
- **grammY** + plugins: `@grammyjs/menu`, `@grammyjs/conversations` (sessions are bundled in conversations).
- **better-sqlite3** — synchronous, fast, single-file DB. Perfect for a single-process bot.
- **dotenv** + **zod** — parse and validate environment variables on startup.
- **@heyputer/puter.js** — Puter SDK, used through its `init()` Node.js entry point.

### 7.2 Subscription gate
- Channel: `@privatekey_ai` (configurable via `REQUIRED_CHANNEL`; empty = disable gate).
- Cache TTL: 5 minutes for **subscribed** users only; non-subscribed users are rechecked every action so they don't have to wait after subscribing.
- Cache key: `users.subscription_verified_at`.
- On `getChatMember` failure (e.g. bot lost access): log the error, refuse access. README documents that the bot may need to be added as a channel admin if `@privatekey_ai` is ever turned private.

### 7.3 Long polling vs webhooks
Long polling. Reasons: zero infra (no HTTPS endpoint required), runs identically on a laptop and a server, no SSL configuration, perfectly fine for low-traffic bots.

### 7.4 No streaming in v1
Telegram allows ~1 edit/second per message. Streaming a token-per-token AI reply would force aggressive throttling and message-splitting logic. Instead the bot sends a periodic `typing…` chat action and replies with the full text once Puter resolves. Streaming can be added in v2 if needed.

### 7.5 Markdown handling
Puter's AI replies often contain Markdown (\*\*bold\*\*, \`code\`, code fences, lists). Telegram's MarkdownV2 mode is strict — every reserved character (`_*[]()~\`>#+-=|{}.!`) must be escaped except inside the entities themselves.

Strategy:
1. Try to send with `parse_mode: 'MarkdownV2'` after escaping non-entity characters.
2. If the API returns a parse error, retry with `parse_mode: undefined` (plain text).

The escaping helper lives in `src/utils/markdown.js`.

### 7.6 Token storage
Puter tokens are stored in plain text in SQLite. The DB file lives in `./data/bot.db`. On Linux deployments the README recommends `chmod 700 data/ && chmod 600 data/bot.db`. Encryption at rest is out of scope for v1; if added later it would use a key from `.env` and AES-GCM.

### 7.7 Error handling philosophy
- All command/menu/conversation handlers are wrapped in `bot.catch(...)` (grammY's global handler) which logs the stack and replies with a generic apology.
- Specific Puter errors (`401`, `429`) are recognized and handled with user-facing messages.
- The bot **never** leaks raw error messages or stack traces to users.

## 8. Configuration (`.env`)

```
# Required
TELEGRAM_BOT_TOKEN=                  # from @BotFather

# Subscription gate
REQUIRED_CHANNEL=@privatekey_ai      # empty string = gate disabled
SUBSCRIPTION_CACHE_TTL_MIN=5

# Optional / defaults
DATABASE_PATH=./data/bot.db
HISTORY_MESSAGES=20
DEFAULT_MODEL=gpt-5-nano
LOG_LEVEL=info
```

The `.env.example` mirrors this with comments.

## 9. Project Layout

```
FreeAI/
├── .env.example
├── .gitignore                   # excludes .env, data/*.db, node_modules/
├── package.json
├── Dockerfile
├── README.md                    # setup, BotFather, Puter token, deployment
├── docs/superpowers/
│   ├── specs/
│   │   └── 2026-04-26-telegram-puter-ai-bot-design.md   # this doc
│   └── plans/                   # produced by writing-plans skill
├── data/
│   └── .gitkeep                 # SQLite file is created at first run
└── src/
    ├── index.js                 # entry: loads .env, runs migrations, starts bot
    ├── bot.js                   # grammY setup
    ├── config.js                # zod-validated env
    ├── models.js                # curated model catalog
    ├── db/
    │   ├── index.js             # opens DB + applies schema
    │   ├── users.js             # users repository
    │   └── messages.js          # messages repository
    ├── puter/
    │   └── client.js            # init(token) wrapper + helpers
    ├── middleware/
    │   └── subscription.js
    ├── menus/
    │   ├── main.js
    │   ├── models.js
    │   ├── system.js
    │   └── subscription.js
    ├── conversations/
    │   ├── login.js
    │   └── system.js
    ├── handlers/
    │   ├── start.js
    │   ├── chat.js
    │   └── errors.js
    └── utils/
        └── markdown.js
```

## 10. Deployment

### 10.1 Local (Windows / macOS / Linux)
```
git clone <repo>
cd FreeAI
npm install
cp .env.example .env       # fill TELEGRAM_BOT_TOKEN
npm start
```

### 10.2 Docker
```
docker build -t freeai-bot .
docker run -d \
  --name freeai-bot \
  --env-file .env \
  -v $(pwd)/data:/app/data \
  --restart unless-stopped \
  freeai-bot
```

### 10.3 Linux service (systemd)
README will provide a `freeai-bot.service` template (User, WorkingDirectory, ExecStart=node src/index.js, Restart=on-failure, EnvironmentFile=).

## 11. Risks & Open Questions

| Risk | Mitigation |
|---|---|
| Puter model IDs in `models.js` may not match real Puter catalog | Verify with `puter.ai.listModels()` during implementation; one-file fix |
| `@heyputer/puter.js` Node.js path may differ from docs (`/src/init.cjs`) | Implementation step: install the package and inspect its `package.json` exports first |
| Telegram MarkdownV2 escaping bugs | Plain-text fallback + unit tests for the escape helper |
| Puter token leakage via DB file | Documented file-system permissions; encryption deferred to v2 |
| Channel `@privatekey_ai` becomes private | Document need to add bot as admin |
| Long messages from AI (>4096 chars) | Split on paragraph/sentence boundaries before sending |

## 12. Out of Scope (future work)

- Streaming responses
- Multi-language UI
- Image generation, TTS, STT, OCR
- Function calling
- Token encryption at rest
- Webhook deployment mode
- Admin commands (`/stats`, `/broadcast`)
- Per-user rate limiting

---

## Appendix A — Puter Node.js usage (verified)

From `https://docs.puter.com/getting-started/`:

```js
import { init } from "@heyputer/puter.js/src/init.cjs";
const puter = init(process.env.puterAuthToken);

puter.ai.chat("What color was Napoleon's white horse?").then(console.log);
```

The bot creates one `puter` instance per user token (cached in-process by `telegram_id`). It never holds a single global Puter token.
