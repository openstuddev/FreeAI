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
        return u.puter_token ? "🔑 Сменить токен" : "🔑 Войти в Puter";
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
    .text("📝 System prompt", async (ctx) => {
      await ctx.menu.nav("system");
    })
    .row()
    .text("🗑 Очистить историю", async (ctx) => {
      await ctx.menu.nav("clear-history");
    })
    .row()
    .text("ℹ️ Как тут жить", async (ctx) => {
      await ctx.editMessageText(helpText(), { parse_mode: undefined });
    });
  return menu;
}

function helpText() {
  return [
    "🧀 Как тут жить:",
    "",
    "1. Зарегайся на https://puter.com",
    "2. Settings → API Tokens → Create",
    "3. Жми «🔑 Войти в Puter» и пришли токен",
    "4. Выбирай модель и пиши",
    "",
    "Все запросы идут через ТВОЙ Puter-аккаунт. Бот не платит и с тебя не берёт. Catch — это и есть весь catch.",
  ].join("\n");
}
