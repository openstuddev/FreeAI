import { Menu } from "@grammyjs/menu";

export function buildClearHistoryMenu({ messagesRepo }) {
  return new Menu("clear-history")
    .text("✅ Да, удалить", async (ctx) => {
      messagesRepo.deleteAll(ctx.from.id);
      await ctx.answerCallbackQuery({ text: "История очищена" });
      await ctx.menu.nav("main");
    })
    .row()
    .back("⬅️ Отмена");
}
