import {
  isSubscribedStatus,
  isCacheFresh,
  gateMessageText,
} from "./subscription-logic.js";

/**
 * Build a grammY middleware that enforces channel subscription.
 *
 * Behavior:
 *  - If `channelHandle` is null → no-op (gate disabled).
 *  - If user is in cache (subscription_verified_at is fresh) → pass through.
 *  - Otherwise call bot.api.getChatMember; if subscribed mark cache, pass
 *    through. If not subscribed, deliver gate keyboard and STOP propagation.
 *  - On API errors (e.g. bot not in channel) log and STOP with a generic msg.
 */
export function createSubscriptionMiddleware({
  channelHandle,
  ttlMin,
  usersRepo,
  defaultModel,
  subscriptionMenu,
  logger,
}) {
  if (!channelHandle) {
    return async (_ctx, next) => next();
  }

  return async (ctx, next) => {
    if (!ctx.from) return next(); // channel posts, etc.

    const tgId = ctx.from.id;
    const user = usersRepo.getOrCreate(tgId, defaultModel);

    if (isCacheFresh(user.subscription_verified_at, ttlMin)) {
      return next();
    }

    let status;
    try {
      const member = await ctx.api.getChatMember(channelHandle, tgId);
      status = member?.status;
    } catch (err) {
      logger?.error?.(`getChatMember failed: ${err?.message}`);
      await safeReply(
        ctx,
        "🪤 Проверка подписки не прошла. Попробуй позже."
      );
      return; // stop propagation
    }

    if (isSubscribedStatus(status)) {
      usersRepo.markSubscriptionVerified(tgId);
      return next();
    }

    usersRepo.clearSubscriptionVerified(tgId);

    await safeReply(ctx, gateMessageText(channelHandle), {
      reply_markup: subscriptionMenu,
    });
    // do NOT call next() — gate stops everything
  };
}

async function safeReply(ctx, text, extra) {
  try {
    if (ctx.callbackQuery) {
      await ctx.answerCallbackQuery().catch(() => {});
    }
    await ctx.reply(text, extra);
  } catch {
    /* silent — Telegram may have rate-limited or the chat may be closed */
  }
}
