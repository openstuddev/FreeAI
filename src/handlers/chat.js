import { askChat } from "../puter/client.js";
import { escapeMarkdownV2 } from "../utils/markdown.js";

const TYPING_INTERVAL_MS = 4000;

export function buildChatHandler({
  usersRepo,
  messagesRepo,
  historyMessages,
  defaultModel,
  logger,
}) {
  return async function chatHandler(ctx) {
    const tgId = ctx.from.id;
    const text = ctx.message.text;
    const user = usersRepo.getOrCreate(tgId, defaultModel);

    if (!user.puter_token) {
      await ctx.reply(
        "🔒 Сначала войди в Puter. Отправь /start и нажми «🔑 Войти в Puter»."
      );
      return;
    }

    // Build context: optional system + last N messages + current user message.
    const history = messagesRepo.getRecent(tgId, historyMessages);
    const messages = [];
    if (user.system_prompt) {
      messages.push({ role: "system", content: user.system_prompt });
    }
    messages.push(...history);
    messages.push({ role: "user", content: text });

    // Keep showing "typing" until we get a reply.
    let stopTyping = false;
    const typing = async () => {
      while (!stopTyping) {
        try {
          await ctx.api.sendChatAction(ctx.chat.id, "typing");
        } catch {}
        await new Promise((r) => setTimeout(r, TYPING_INTERVAL_MS));
      }
    };
    typing();

    let aiText;
    try {
      aiText = await askChat(user.puter_token, messages, user.model);
    } catch (err) {
      stopTyping = true;
      const status = err?.status ?? err?.response?.status;
      const msg = String(err?.message ?? err);
      logger?.error?.(`Puter error for tg=${tgId}: ${msg}`);

      if (status === 401 || /unauthorized|invalid token/i.test(msg)) {
        usersRepo.clearToken(tgId);
        await ctx.reply(
          "🔑 Твой Puter-токен больше не действителен. Войди заново через /start → «🔑 Войти в Puter»."
        );
        return;
      }
      if (status === 429 || /quota|rate limit/i.test(msg)) {
        await ctx.reply(
          "⛔ Ты исчерпал свой Puter-лимит. Пополни на puter.com или подожди обновления квоты."
        );
        return;
      }
      await ctx.reply("Что-то пошло не так. Попробуй ещё раз позже.");
      return;
    }
    stopTyping = true;

    // Persist BEFORE replying so a Telegram failure doesn't lose history.
    messagesRepo.recordExchange(tgId, text, aiText ?? "");

    await sendLong(ctx, aiText ?? "(пустой ответ)");
  };
}

/**
 * Send a long text, splitting on paragraph boundaries to fit Telegram's
 * 4096-char limit, with MarkdownV2 + plain-text fallback.
 */
async function sendLong(ctx, text) {
  const MAX = 4000;
  const parts = splitIntoChunks(text, MAX);
  for (const part of parts) {
    let sent = false;
    try {
      await ctx.reply(escapeMarkdownV2(part), { parse_mode: "MarkdownV2" });
      sent = true;
    } catch {
      /* fall through */
    }
    if (!sent) {
      await ctx.reply(part);
    }
  }
}

function splitIntoChunks(text, max) {
  if (text.length <= max) return [text];
  const out = [];
  let buf = "";
  for (const para of text.split(/\n\n+/)) {
    const candidate = buf ? `${buf}\n\n${para}` : para;
    if (candidate.length > max) {
      if (buf) out.push(buf);
      if (para.length > max) {
        for (let i = 0; i < para.length; i += max) {
          out.push(para.slice(i, i + max));
        }
        buf = "";
      } else {
        buf = para;
      }
    } else {
      buf = candidate;
    }
  }
  if (buf) out.push(buf);
  return out;
}
