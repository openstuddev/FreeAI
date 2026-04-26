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
    expect(cfg.loginHelperUrl).toBe(null);
  });

  it("accepts LOGIN_HELPER_URL when https", () => {
    const cfg = parseConfig({
      ...baseEnv,
      LOGIN_HELPER_URL: "https://user.github.io/FreeAI/login.html",
    });
    expect(cfg.loginHelperUrl).toBe(
      "https://user.github.io/FreeAI/login.html"
    );
  });

  it("rejects non-https LOGIN_HELPER_URL", () => {
    expect(() =>
      parseConfig({ ...baseEnv, LOGIN_HELPER_URL: "http://insecure" })
    ).toThrow(/https/);
  });

  it("treats empty LOGIN_HELPER_URL as null", () => {
    const cfg = parseConfig({ ...baseEnv, LOGIN_HELPER_URL: "   " });
    expect(cfg.loginHelperUrl).toBe(null);
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
