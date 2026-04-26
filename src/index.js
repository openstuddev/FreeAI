import "dotenv/config";
import { ProxyAgent, setGlobalDispatcher } from "undici";
import { HttpsProxyAgent } from "https-proxy-agent";
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

function parseProxyOrThrow(raw) {
  // We're strict here: a malformed URL silently breaks everything (the
  // request goes direct, then ETIMEDOUT 20s later). Better to fail loud.
  let u;
  try {
    u = new URL(raw);
  } catch {
    throw new Error(
      `Invalid proxy URL "${raw}". Expected http://user:pass@host:port`
    );
  }
  if (!/^https?:$/.test(u.protocol)) {
    throw new Error(`Proxy URL must use http:// or https://, got ${u.protocol}`);
  }
  if (!u.hostname || !u.port) {
    throw new Error(
      `Proxy URL is missing host or port (likely missing "@" between password and host): "${raw}"`
    );
  }
  return u;
}

function maskProxy(u) {
  if (u.password) u.password = "***";
  return u.toString();
}

async function main() {
  const config = parseConfig(process.env);
  const logger = makeLogger(config.logLevel);

  // Optional outbound proxy. Two layers, because the bot uses two HTTP stacks:
  //   - Native fetch (puter.js + most modern libs) → undici dispatcher
  //   - node-fetch (grammY uses this internally)   → https-proxy-agent passed
  //     into bot.client.baseFetchConfig.agent
  // Both must be set or one of them silently bypasses the proxy.
  const rawProxy = (process.env.HTTPS_PROXY || process.env.HTTP_PROXY || "").trim();
  let proxyAgent = null;
  if (rawProxy) {
    const u = parseProxyOrThrow(rawProxy);
    setGlobalDispatcher(new ProxyAgent(rawProxy));
    proxyAgent = new HttpsProxyAgent(rawProxy);
    logger.info(`Using proxy: ${maskProxy(u)}`);
  }

  const db = openDb(config.databasePath);
  const usersRepo = createUsersRepo(db);
  const messagesRepo = createMessagesRepo(db);

  const bot = createBot({
    config,
    db,
    usersRepo,
    messagesRepo,
    logger,
    proxyAgent,
  });

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

  // Sanity-check the token BEFORE bot.start() so we get a real error fast
  // instead of silent polling retries (grammY swallows polling errors by default).
  try {
    const me = await bot.api.getMe();
    logger.info(`Token OK: bot is @${me.username} (id=${me.id})`);
  } catch (err) {
    logger.error(`Token check failed: ${err?.message ?? err}`);
    throw err;
  }

  await bot.start({
    onStart: (info) => logger.info(`Polling as @${info.username}`),
  });
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
