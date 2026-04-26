export function installErrorHandler(bot, logger) {
  bot.catch(async (err) => {
    const ctx = err.ctx;
    logger?.error?.(`grammY error for update ${ctx?.update?.update_id}: ${err.error}`);
    if (err.error?.stack) logger?.error?.(err.error.stack);
    try {
      await ctx?.reply?.("⚠️ Что-то пошло не так. Попробуй ещё раз.");
    } catch {}
  });
}
