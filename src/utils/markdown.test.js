import { describe, it, expect } from "vitest";
import { escapeMarkdownV2 } from "./markdown.js";

describe("escapeMarkdownV2", () => {
  it("escapes plain reserved characters", () => {
    expect(escapeMarkdownV2("a.b")).toBe("a\\.b");
    expect(escapeMarkdownV2("a-b")).toBe("a\\-b");
    expect(escapeMarkdownV2("(hi)")).toBe("\\(hi\\)");
  });

  it("leaves text without reserved chars unchanged", () => {
    expect(escapeMarkdownV2("hello world")).toBe("hello world");
  });

  it("preserves fenced code blocks verbatim", () => {
    const input = "Look:\n```js\nconst x = 1.0;\n```\nDone.";
    const out = escapeMarkdownV2(input);
    expect(out).toContain("```js\nconst x = 1.0;\n```");
    expect(out).toContain("Done\\.");
    expect(out.startsWith("Look:\n")).toBe(true);
  });

  it("preserves inline code verbatim", () => {
    const input = "Use `foo.bar()` here.";
    const out = escapeMarkdownV2(input);
    expect(out).toContain("`foo.bar()`");
    expect(out).toContain("here\\.");
  });

  it("escapes backslash itself", () => {
    expect(escapeMarkdownV2("a\\b")).toBe("a\\\\b");
  });
});
