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
        "🔑 Достаём ключ от мышеловки",
        "",
        "1. Открой https://puter.com и войди (или зарегайся).",
        "2. Settings → API Tokens → Create.",
        "3. Скопируй токен и пришли следующим сообщением.",
        "",
        `Передумал — «${CANCEL_TEXT}».`,
      ].join("\n")
    );

    while (true) {
      const reply = await conversation.waitFor("message:text");
      const text = reply.message.text.trim();
      if (text === CANCEL_TEXT || text === "/cancel") {
        await ctx.reply("Откатил. Сыр цел.");
        return;
      }

      // Run the network call OUTSIDE conversation persistence.
      const result = await conversation.external(() => validateToken(text));

      if (result.ok) {
        usersRepo.setToken(ctx.from.id, text, result.username);
        await ctx.reply(
          `🧀 Ты в сырной комнате, ${result.username}. Пиши.`
        );
        return;
      }

      await ctx.reply(
        `🪤 Не пускают. Puter ругается: «${result.error}». Кинь другой токен или «${CANCEL_TEXT}».`
      );
    }
  };
}
