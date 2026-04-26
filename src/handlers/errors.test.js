import { describe, it, expect, vi } from "vitest";
import { installErrorHandler } from "./errors.js";

function makeBot() {
  let handler;
  return {
    catch: (fn) => {
      handler = fn;
    },
    fire: async (err) => handler(err),
  };
}

function makeErr({ ctx, error }) {
  return { ctx, error };
}

describe("installErrorHandler", () => {
  it("treats 403 (bot blocked by user) as info, doesn't try to reply", async () => {
    const bot = makeBot();
    const logger = { info: vi.fn(), error: vi.fn() };
    installErrorHandler(bot, logger);

    const ctx = {
      update: { update_id: 42 },
      reply: vi.fn().mockResolvedValue(),
    };
    await bot.fire(
      makeErr({
        ctx,
        error: {
          error_code: 403,
          description: "Forbidden: bot was blocked by the user",
        },
      })
    );

    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.info.mock.calls[0][0]).toMatch(/blocked/i);
    expect(logger.error).not.toHaveBeenCalled();
    expect(ctx.reply).not.toHaveBeenCalled();
  });

  it('treats 400 "chat not found" as info', async () => {
    const bot = makeBot();
    const logger = { info: vi.fn(), error: vi.fn() };
    installErrorHandler(bot, logger);

    await bot.fire(
      makeErr({
        ctx: { update: { update_id: 7 }, reply: vi.fn() },
        error: { error_code: 400, description: "Bad Request: chat not found" },
      })
    );

    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("logs other errors as error and tries to reply", async () => {
    const bot = makeBot();
    const logger = { info: vi.fn(), error: vi.fn() };
    installErrorHandler(bot, logger);

    const ctx = {
      update: { update_id: 99 },
      reply: vi.fn().mockResolvedValue(),
    };
    await bot.fire(
      makeErr({
        ctx,
        error: {
          error_code: 500,
          description: "Internal Server Error",
          message: "boom",
        },
      })
    );

    expect(logger.error).toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith("💀 Сыр треснул. Попробуй ещё раз.");
  });

  it("swallows reply errors so the error loop doesn't crash", async () => {
    const bot = makeBot();
    const logger = { info: vi.fn(), error: vi.fn() };
    installErrorHandler(bot, logger);

    const ctx = {
      update: { update_id: 1 },
      reply: vi.fn().mockRejectedValue(new Error("network down")),
    };

    await expect(
      bot.fire(
        makeErr({
          ctx,
          error: { error_code: 500, description: "boom" },
        })
      )
    ).resolves.not.toThrow();
  });
});
