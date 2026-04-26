import { describe, it, expect } from "vitest";
import {
  isSubscribedStatus,
  isCacheFresh,
  gateMessageText,
} from "./subscription-logic.js";

describe("isSubscribedStatus", () => {
  it("treats member-like statuses as subscribed", () => {
    for (const s of ["creator", "administrator", "member", "restricted"]) {
      expect(isSubscribedStatus(s)).toBe(true);
    }
  });

  it("treats left/kicked as not subscribed", () => {
    for (const s of ["left", "kicked"]) {
      expect(isSubscribedStatus(s)).toBe(false);
    }
  });

  it("returns false for unknown statuses", () => {
    expect(isSubscribedStatus("weird")).toBe(false);
    expect(isSubscribedStatus(undefined)).toBe(false);
  });
});

describe("isCacheFresh", () => {
  it("returns false when verifiedAt is null", () => {
    expect(isCacheFresh(null, 5, Date.now())).toBe(false);
  });

  it("returns true when within ttl", () => {
    const now = 10_000_000;
    const oneMinuteAgo = now - 60_000;
    expect(isCacheFresh(oneMinuteAgo, 5, now)).toBe(true);
  });

  it("returns false when older than ttl", () => {
    const now = 10_000_000;
    const tenMinutesAgo = now - 10 * 60_000;
    expect(isCacheFresh(tenMinutesAgo, 5, now)).toBe(false);
  });

  it("returns false when ttlMin is 0 (always stale)", () => {
    expect(isCacheFresh(Date.now(), 0, Date.now())).toBe(false);
  });
});

describe("gateMessageText", () => {
  it("includes the channel handle and the action button hint", () => {
    const text = gateMessageText("@privatekey_ai");
    expect(text).toContain("@privatekey_ai");
    expect(text).toContain("✅ Я подписался");
  });
});
