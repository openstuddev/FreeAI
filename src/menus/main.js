import { Menu } from "@grammyjs/menu";
import { findModel } from "../models.js";

/**
 * Build the main menu. Some buttons rely on per-user state, so labels are
 * computed at render time via dynamic-text functions.
 */
export function buildMainMenu({ usersRepo, defaultModel }) {
  const menu = new Menu("main")
    .text(
      (ctx) => {
        const u = usersRepo.getOrCreate(ctx.from.id, defaultModel);
        return u.puter_token ? "🔑 Перезайти / выйти" : "🔑 Войти в Puter";
      },
      async (ctx) => {
        await ctx.conversation.enter("login");
      }
    )
    .row()
    .text(
      (ctx) => {
        const u = usersRepo.getOrCreate(ctx.from.id, defaultModel);
        const m = findModel(u.model);
        return `🤖 Модель: ${m ? m.label : u.model}`;
      },
      async (ctx) => {
        await ctx.menu.nav("models");
      }
    )
    .row()
    .text("⚙️ System prompt", async (ctx) => {
      await ctx.menu.nav("system");
    })
    .row()
    .text("🗑 Очистить историю", async (ctx) => {
      await ctx.menu.nav("clear-history");
    })
    .row()
    .text("ℹ️ Помощь", async (ctx) => {
      await ctx.editMessageText(helpText(), { parse_mode: undefined });
    });
  return menu;
}

function helpText() {
  return [
    "ℹ️ Как пользоваться:",
    "",
    "1. Зарегистрируйся на https://puter.com",
    "2. В Settings → API Tokens создай токен",
    "3. Здесь нажми «🔑 Войти в Puter» и пришли токен",
    "4. Выбери модель и просто пиши сообщения",
    "",
    "Все запросы идут через ТВОЙ Puter-аккаунт — ты используешь свой бесплатный лимит / свои деньги, бот ничего не списывает.",
  ].join("\n");
}
