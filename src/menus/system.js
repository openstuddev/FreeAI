import { Menu } from "@grammyjs/menu";

export function buildSystemMenu({ usersRepo, defaultModel }) {
  const menu = new Menu("system").dynamic((ctx, range) => {
    const u = usersRepo.getOrCreate(ctx.from.id, defaultModel);

    if (u.system_prompt) {
      range
        .text("✏️ Изменить", async (c) => c.conversation.enter("system"))
        .text("🗑 Удалить", async (c) => {
          usersRepo.setSystemPrompt(c.from.id, null);
          await c.answerCallbackQuery({ text: "🧀 Удалил. Сыр забыл." });
          c.menu.update();
        })
        .row();
    } else {
      range
        .text("➕ Задать system prompt", async (c) =>
          c.conversation.enter("system")
        )
        .row();
    }
    range.back("⬅️ Назад");
  });
  return menu;
}

export function currentSystemPromptText(user) {
  if (!user.system_prompt) {
    return "📝 System prompt пустой.";
  }
  return `📝 Сейчас:\n\n${user.system_prompt}`;
}
