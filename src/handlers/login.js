/**
 * Login flow dispatch.
 *
 * Two paths:
 *
 * 1. Mini-App (preferred). When `loginHelperUrl` is configured, we send a
 *    one-shot reply keyboard with a Telegram Web App button. The user taps
 *    it, the helper page authenticates against Puter, and sends the token
 *    back via `Telegram.WebApp.sendData()`. The bot picks it up via the
 *    `message:web_app_data` filter (see `web-app-data.js`).
 *
 * 2. Manual paste (fallback). When no helper URL is set we enter the
 *    grammY conversation that asks the user to paste a token. Useful for
 *    operator self-testing.
 */
export function buildTriggerLogin({ loginHelperUrl }) {
  return async function triggerLogin(ctx) {
    if (loginHelperUrl) {
      await ctx.reply(
        "🔑 Тапни кнопку — откроется Mini App с Puter. Залогинься (или зарегайся), токен прилетит сам.",
        {
          link_preview_options: { is_disabled: true },
          reply_markup: {
            keyboard: [
              [
                {
                  text: "🔑 Войти в Puter",
                  web_app: { url: loginHelperUrl },
                },
              ],
              [{ text: "Отмена ❌" }],
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
            input_field_placeholder: "Тапни кнопку выше",
            is_persistent: false,
          },
        }
      );
      return;
    }
    // Fallback: classic paste-token conversation.
    await ctx.conversation.enter("login");
  };
}
