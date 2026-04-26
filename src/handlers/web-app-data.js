import { validateToken } from "../puter/client.js";

/**
 * Handles `message:web_app_data` updates — the payload posted by the Mini App
 * when it calls `Telegram.WebApp.sendData(token)`. The Mini App sends just
 * the raw Puter token string.
 *
 * After processing we always hide the temporary reply keyboard.
 */
export function buildWebAppDataHandler({ usersRepo, logger }) {
  return async function webAppDataHandler(ctx) {
    const tgId = ctx.from.id;
    const raw = ctx.message?.web_app_data?.data ?? "";
    const token = String(raw).trim();

    if (!token) {
      await ctx.reply("🪤 Mini App ничего не прислала. Попробуй ещё раз.", {
        reply_markup: { remove_keyboard: true },
      });
      return;
    }

    const result = await validateToken(token);

    if (!result.ok) {
      logger?.warn?.(
        `web_app_data: invalid token from tg=${tgId}: ${result.error}`
      );
      await ctx.reply(
        `🪤 Не пускают. Puter ругается: «${result.error}». Попробуй ещё раз.`,
        { reply_markup: { remove_keyboard: true } }
      );
      return;
    }

    usersRepo.setToken(tgId, token, result.username);
    await ctx.reply(
      `🧀 Ты в сырной комнате, ${result.username}. Пиши.`,
      { reply_markup: { remove_keyboard: true } }
    );
  };
}
