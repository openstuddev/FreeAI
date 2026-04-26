import { describe, it, expect, vi, beforeEach } from "vitest";

const validateTokenMock = vi.fn();
vi.mock("../puter/client.js", () => ({
  validateToken: (...args) => validateTokenMock(...args),
}));

const { buildWebAppDataHandler } = await import("./web-app-data.js");

function makeCtx({ data = "", from = { id: 7 } } = {}) {
  return {
    from,
    message: { web_app_data: { data } },
    reply: vi.fn().mockResolvedValue(),
  };
}

beforeEach(() => {
  validateTokenMock.mockReset();
});

describe("webAppDataHandler", () => {
  function makeRepo() {
    return { setToken: vi.fn() };
  }

  it("rejects empty payload and removes the keyboard", async () => {
    const usersRepo = makeRepo();
    const handler = buildWebAppDataHandler({ usersRepo, logger: undefined });
    const ctx = makeCtx({ data: "   " });

    await handler(ctx);

    expect(validateTokenMock).not.toHaveBeenCalled();
    expect(usersRepo.setToken).not.toHaveBeenCalled();
    const [, opts] = ctx.reply.mock.calls[0];
    expect(opts.reply_markup).toEqual({ remove_keyboard: true });
  });

  it("rejects invalid token", async () => {
    validateTokenMock.mockResolvedValue({ ok: false, error: "bad token" });
    const usersRepo = makeRepo();
    const logger = { warn: vi.fn() };
    const handler = buildWebAppDataHandler({ usersRepo, logger });
    const ctx = makeCtx({ data: "deadbeef" });

    await handler(ctx);

    expect(validateTokenMock).toHaveBeenCalledWith("deadbeef");
    expect(usersRepo.setToken).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
    const [text, opts] = ctx.reply.mock.calls[0];
    expect(text).toMatch(/bad token/);
    expect(opts.reply_markup).toEqual({ remove_keyboard: true });
  });

  it("saves token and welcomes on success", async () => {
    validateTokenMock.mockResolvedValue({ ok: true, username: "alice" });
    const usersRepo = makeRepo();
    const handler = buildWebAppDataHandler({ usersRepo, logger: undefined });
    const ctx = makeCtx({ data: "good-token" });

    await handler(ctx);

    expect(usersRepo.setToken).toHaveBeenCalledWith(7, "good-token", "alice");
    const [text, opts] = ctx.reply.mock.calls[0];
    expect(text).toMatch(/alice/);
    expect(text).toMatch(/сырной/);
    expect(opts.reply_markup).toEqual({ remove_keyboard: true });
  });

  it("trims whitespace around the token before validation", async () => {
    validateTokenMock.mockResolvedValue({ ok: true, username: "bob" });
    const usersRepo = makeRepo();
    const handler = buildWebAppDataHandler({ usersRepo, logger: undefined });
    const ctx = makeCtx({ data: "  spaced-token \n" });

    await handler(ctx);

    expect(validateTokenMock).toHaveBeenCalledWith("spaced-token");
    expect(usersRepo.setToken).toHaveBeenCalledWith(7, "spaced-token", "bob");
  });
});
