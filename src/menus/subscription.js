import { Menu } from "@grammyjs/menu";
import {
  isSubscribedStatus,
  gateMessageText,
} from "../middleware/subscription-logic.js";

/**
 * Builds the gate keyboard. The "✅ Я подписался" button performs the
 * subscription recheck itself (the subscription middleware doesn't run for
 * this callback because the menu must be registered BEFORE the middleware,
 * otherwise users couldn't escape the gate).
 */
export function buildSubscriptionMenu(channelHandle, { usersRepo }) {
  const url = handleToUrl(channelHandle);
  const menu = new Menu("subscription-gate");
  menu
    .url("📢 Подписаться на канал", url)
    .row()
    .text("✅ Я подписался", async (ctx) => {
      let status;
      try {
        const member = await ctx.api.getChatMember(channelHandle, ctx.from.id);
        status = member?.status;
      } catch {
        // We couldn't check (channel handle wrong / bot not admin in
        // private channel / Telegram blip). Just re-show the same gate
        // and let the user try again.
        await safeAnswer(ctx, "🪤 Проверка не прошла, попробуй ещё.");
        await ctx.reply(gateMessageText(channelHandle), { reply_markup: menu });
        return;
      }

      if (!isSubscribedStatus(status)) {
        // Not actually subscribed — repeat the same gate message so it's
        // clear what to do.
        await safeAnswer(ctx, "🪤 Подписки нет.");
        await ctx.reply(gateMessageText(channelHandle), { reply_markup: menu });
        return;
      }

      usersRepo.markSubscriptionVerified(ctx.from.id);
      await safeAnswer(ctx, "🧀 Заходи.");
      await ctx.deleteMessage().catch(() => {});
      const { showAfterSubscriptionCheck } = await import("../handlers/start.js");
      await showAfterSubscriptionCheck(ctx);
    });
  return menu;
}

/**
 * Calls ctx.answerCallbackQuery and swallows the "query too old" 400 from
 * Telegram (happens when the bot was offline for >30s after the user tapped).
 * The chat-reply paths above still inform the user — the toast is bonus.
 */
async function safeAnswer(ctx, text, showAlert = false) {
  try {
    await ctx.answerCallbackQuery({ text, show_alert: showAlert });
  } catch (e) {
    // 400 query is too old / invalid — ignore.
  }
}

function handleToUrl(handle) {
  const trimmed = handle.startsWith("@") ? handle.slice(1) : handle;
  return `https://t.me/${trimmed}`;
}
