import { describe, it, expect, vi } from "vitest";
import { buildTriggerLogin } from "./login.js";

function makeCtx() {
  return {
    reply: vi.fn().mockResolvedValue(),
    conversation: { enter: vi.fn().mockResolvedValue() },
  };
}

describe("triggerLogin", () => {
  it("opens Mini App via reply keyboard when helper URL is set", async () => {
    const trigger = buildTriggerLogin({
      loginHelperUrl: "https://user.github.io/FreeAI/login.html",
    });
    const ctx = makeCtx();

    await trigger(ctx);

    expect(ctx.conversation.enter).not.toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledTimes(1);
    const [text, opts] = ctx.reply.mock.calls[0];
    expect(text).toMatch(/Mini App/);
    expect(opts.link_preview_options).toEqual({ is_disabled: true });
    const kb = opts.reply_markup.keyboard;
    expect(kb[0][0]).toEqual({
      text: "🔑 Войти в Puter",
      web_app: { url: "https://user.github.io/FreeAI/login.html" },
    });
    expect(opts.reply_markup.one_time_keyboard).toBe(true);
    expect(opts.reply_markup.resize_keyboard).toBe(true);
  });

  it("falls back to conversation when helper URL is missing", async () => {
    const trigger = buildTriggerLogin({ loginHelperUrl: null });
    const ctx = makeCtx();

    await trigger(ctx);

    expect(ctx.conversation.enter).toHaveBeenCalledWith("login");
    expect(ctx.reply).not.toHaveBeenCalled();
  });
});
