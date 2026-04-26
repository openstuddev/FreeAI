# FreeAI — Telegram Bot on Puter.js

Public Telegram bot. Chat with 500+ AI models (GPT, Claude, Gemini, Grok, DeepSeek, Llama, Mistral and more) for free, paying with **your own** Puter quota — the bot operator pays nothing for AI tokens.

- Per-user authentication with your own Puter token
- ~10 curated top models, switchable from an inline keyboard
- Per-user dialogue history (sliding window of last 20 messages)
- Per-user system prompt
- Subscription-gated to a configurable Telegram channel

## Prerequisites

- Node.js >= 20
- A Telegram bot token from [@BotFather](https://t.me/BotFather)
- A Puter account at https://puter.com (each user creates their own; the operator does **not** need one)
- (Windows only) Visual C++ Build Tools — `better-sqlite3` is a native module. Easiest route: run via Docker (the provided Dockerfile installs build tools automatically). Alternatively: install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with the "Desktop development with C++" workload, or use WSL.

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

MIT
