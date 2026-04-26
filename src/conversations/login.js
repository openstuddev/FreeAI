import { validateToken } from "../puter/client.js";

const CANCEL_TEXT = "Отмена ❌";

/**
 * grammY conversation factory. Two modes depending on whether the auth
 * helper URL is configured:
 *
 *   - With LOGIN_HELPER_URL set (the normal case): we show an inline
 *     keyboard with a "🔑 Открыть Puter" button that opens the helper
 *     page in the user's browser. The page handles Puter login (any
 *     method — email/Google/GitHub), shows the resulting token with a
 *     "Скопировать" button. The user pastes that token here.
 *
 *   - Without LOGIN_HELPER_URL (operator self-test): we just ask the
 *     user to paste a token they already have.
 *
 * In both cases, we wait for the next text message and validate it via
 * `validateToken()`.
 */
export function buildLoginConversation({ usersRepo, loginHelperUrl }) {
  return async function login(conversation, ctx) {
    if (loginHelperUrl) {
      await ctx.reply(
        [
          "🔑 Войти в Puter",
          "",
          "1. Тапни кнопку ниже — откроется страница в браузере.",
          "2. Залогинься в Puter любым способом (email, Google, GitHub).",
          "3. Страница покажет токен — нажми «Скопировать».",
          "4. Вернись сюда и пришли токен следующим сообщением.",
          "",
          `Передумал — отправь «${CANCEL_TEXT}».`,
        ].join("\n"),
        {
          link_preview_options: { is_disabled: true },
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔑 Открыть Puter", url: loginHelperUrl }],
            ],
          },
        }
      );
    } else {
      await ctx.reply(
        [
          "🔑 Достаём ключ от мышеловки",
          "",
          "Auth-helper не настроен админом. Если ты уже знаешь свой Puter-токен — пришли его следующим сообщением.",
          "",
          `Передумал — «${CANCEL_TEXT}».`,
        ].join("\n")
      );
    }

    while (true) {
      const reply = await conversation.waitFor("message:text");
      const text = reply.message.text.trim();
      if (text === CANCEL_TEXT || text === "/cancel") {
        await ctx.reply("Откатил. Сыр цел.");
        return;
      }

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
