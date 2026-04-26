/**
 * Escape arbitrary text for Telegram MarkdownV2.
 * Strategy:
 *   1. Pull out triple-backtick fenced blocks and single-backtick inline code
 *      into placeholders so their contents are NOT escaped.
 *   2. Escape every reserved character outside the placeholders, including
 *      backslash itself (so backslash must be escaped first).
 *   3. Restore placeholders.
 *
 * Reserved per https://core.telegram.org/bots/api#markdownv2-style:
 *   _ * [ ] ( ) ~ ` > # + - = | { } . !
 * Plus backslash, which must be escaped first.
 */
const RESERVED = /[_*[\]()~`>#+\-=|{}.!]/g;
const FENCE = /```[\s\S]*?```/g;
const INLINE = /`[^`]*`/g;

export function escapeMarkdownV2(text) {
  if (text === null || text === undefined) return "";
  const placeholders = [];

  const stash = (match) => {
    const token = `\u0000PH${placeholders.length}\u0000`;
    placeholders.push(match);
    return token;
  };

  // 1. Stash code blocks first so they aren't touched.
  let work = String(text).replace(FENCE, stash).replace(INLINE, stash);

  // 2. Escape backslash, then reserved chars (order matters so we don't double-escape).
  work = work.replace(/\\/g, "\\\\").replace(RESERVED, (c) => `\\${c}`);

  // 3. Restore stashed code as-is.
  work = work.replace(/\u0000PH(\d+)\u0000/g, (_, i) => placeholders[Number(i)]);

  return work;
}
