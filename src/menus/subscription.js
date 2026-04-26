import { Menu } from "@grammyjs/menu";

/**
 * Builds the gate keyboard. The "I subscribed" button calls back, deletes
 * the gate message, and re-runs the start handler — by then the subscription
 * middleware will re-check via getChatMember.
 */
export function buildSubscriptionMenu(channelHandle) {
  const url = handleToUrl(channelHandle);
  const menu = new Menu("subscription-gate")
    .url("📢 Подписаться на канал", url)
    .row()
    .text("✅ Я подписался", async (ctx) => {
      await ctx.answerCallbackQuery({ text: "Проверяю…" });
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
