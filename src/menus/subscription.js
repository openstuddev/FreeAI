import { Menu } from "@grammyjs/menu";
import { isSubscribedStatus } from "../middleware/subscription-logic.js";

/**
 * Builds the gate keyboard. The "✅ Я подписался" button performs the
 * subscription recheck itself (the subscription middleware doesn't run for
 * this callback because the menu must be registered BEFORE the middleware,
 * otherwise users couldn't escape the gate).
 */
export function buildSubscriptionMenu(channelHandle, { usersRepo }) {
  const url = handleToUrl(channelHandle);
  const menu = new Menu("subscription-gate")
    .url("📢 Подписаться на канал", url)
    .row()
    .text("✅ Я подписался", async (ctx) => {
      let status;
      try {
        const member = await ctx.api.getChatMember(channelHandle, ctx.from.id);
        status = member?.status;
      } catch {
        await ctx.answerCallbackQuery({ text: "🪤 Проверка не прошла. Попробуй ещё." });
        return;
      }

      if (!isSubscribedStatus(status)) {
        await ctx.answerCallbackQuery({
          text: "🪤 Не вижу подписки. Подпишись и жми ещё раз.",
        });
        return;
      }

      usersRepo.markSubscriptionVerified(ctx.from.id);
      await ctx.answerCallbackQuery({ text: "🧀 Заходи." });
      await ctx.deleteMessage().catch(() => {});
      const { showAfterSubscriptionCheck } = await import("../handlers/start.js");
      await showAfterSubscriptionCheck(ctx);
    });
  return menu;
}

function handleToUrl(handle) {
  const trimmed = handle.startsWith("@") ? handle.slice(1) : handle;
  return `https://t.me/${trimmed}`;
}
