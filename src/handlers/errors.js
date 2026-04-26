/**
 * Categorize a grammY error to decide whether to:
 *   - just note it (user blocked us / chat deleted): nothing we can do
 *   - re-reply with a generic "🧀 Сыр треснул" message
 *
 * Telegram error codes we care about:
 *   403 + "bot was blocked by the user"        → user blocked the bot
 *   403 + "user is deactivated"                → account deleted
 *   403 + "bot was kicked from the (super)group" → kicked from a group
 *   400 + "chat not found"                     → chat deleted
 */
function classifyError(err) {
  const code = err?.error_code ?? err?.error?.error_code;
  const desc = String(err?.description ?? err?.error?.description ?? err?.message ?? "");

  if (code === 403) return "unreachable";
  if (code === 400 && /chat not found/i.test(desc)) return "unreachable";
  return "fatal";
}

export function installErrorHandler(bot, logger) {
  bot.catch(async (err) => {
    const ctx = err.ctx;
    const inner = err.error;
    const updateId = ctx?.update?.update_id;
    const kind = classifyError(inner);

    if (kind === "unreachable") {
      logger?.info?.(
        `Skip update ${updateId}: chat unreachable (${inner?.description ?? inner?.message})`
      );
      return;
    }

    logger?.error?.(`grammY error for update ${updateId}: ${inner}`);
    if (inner?.stack) logger?.error?.(inner.stack);
    try {
      await ctx?.reply?.("💀 Сыр треснул. Попробуй ещё раз.");
    } catch {}
  });
}
