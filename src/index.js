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
