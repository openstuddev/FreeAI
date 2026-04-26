import { Menu } from "@grammyjs/menu";

export function buildClearHistoryMenu({ messagesRepo }) {
  return new Menu("clear-history")
    .text("✅ Да, удалить", async (ctx) => {
      messagesRepo.deleteAll(ctx.from.id);
      await ctx.answerCallbackQuery({ text: "🗑️ Чисто. Сыр всё забыл." });
      await ctx.menu.nav("main");
    })
    .row()
    .back("⬅️ Отмена");
}
