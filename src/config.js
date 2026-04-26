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
