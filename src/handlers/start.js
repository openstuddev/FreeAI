import { findModel } from "../models.js";

export function buildStartHandler({ usersRepo, defaultModel, mainMenu }) {
  return async function startHandler(ctx) {
    const u = usersRepo.getOrCreate(ctx.from.id, defaultModel);
    const model = findModel(u.model);
    const firstName = ctx.from?.first_name ?? "сырный гость";
    const isLogged = !!u.puter_token;

    let lines;
    if (isLogged) {
      lines = [
        `🧀 С возвращением, ${firstName}.`,
        "",
        `Модель: ${model ? model.label : u.model}`,
        "Статус: 🧀 в деле",
        "",
        "Пиши, что нужно — отвечу.",
      ];
    } else {
      lines = [
        `🧀 Привет, ${firstName}.`,
        "",
        "Я — Сыр. Бесплатный чат с 500+ AI-моделями: GPT, Claude, Gemini, Grok, DeepSeek и другими.",
        "",
        `Модель: ${model ? model.label : u.model}`,
        "Статус: 🪤 не вошёл",
        "",
        "Чтобы начать — жми «🔑 Войти в Puter» ниже.",
      ];
    }
    await ctx.reply(lines.join("\n"), {
      reply_markup: mainMenu,
      parse_mode: undefined,
    });
  };
}

/**
 * Re-export of the main-menu render so the subscription gate's
 * "I subscribed" button can call it after a successful re-check.
 */
export async function showAfterSubscriptionCheck(ctx) {
  // The bot.js wiring will set ctx.bot.startHandler — fall back to /start.
  if (typeof ctx.bot?.startHandler === "function") {
    await ctx.bot.startHandler(ctx);
  } else {
    await ctx.reply("🧀 Готово. Отправь /start.");
  }
}
