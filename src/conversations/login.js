import { validateToken } from "../puter/client.js";

const CANCEL_TEXT = "Отмена ❌";

/**
 * grammY conversation factory. Returns the `(conversation, ctx)` async
 * function expected by `@grammyjs/conversations`.
 */
export function buildLoginConversation({ usersRepo }) {
  return async function login(conversation, ctx) {
    await ctx.reply(
      [
        "🔑 Войти в Puter",
        "",
        "1. Открой https://puter.com и войди (или зарегистрируйся).",
        "2. Settings → API Tokens → Create.",
        "3. Скопируй токен и пришли его следующим сообщением.",
        "",
        `Чтобы прервать — отправь «${CANCEL_TEXT}».`,
      ].join("\n")
    );

    while (true) {
      const reply = await conversation.waitFor("message:text");
      const text = reply.message.text.trim();
      if (text === CANCEL_TEXT || text === "/cancel") {
        await ctx.reply("Отменено.");
        return;
      }

      // Run the network call OUTSIDE conversation persistence.
      const result = await conversation.external(() => validateToken(text));

      if (result.ok) {
        usersRepo.setToken(ctx.from.id, text, result.username);
        await ctx.reply(
          `✅ Успех! Привет, ${result.username}. Можешь начинать общаться — просто пиши сообщения.`
        );
        return;
      }

      await ctx.reply(
        `❌ Токен невалиден (${result.error}). Пришли другой или «${CANCEL_TEXT}».`
      );
    }
  };
}
