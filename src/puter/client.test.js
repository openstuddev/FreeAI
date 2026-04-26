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
