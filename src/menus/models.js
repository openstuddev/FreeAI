import { Menu } from "@grammyjs/menu";
import { MODELS } from "../models.js";

export function buildModelsMenu({ usersRepo, defaultModel }) {
  const menu = new Menu("models").dynamic((ctx, range) => {
    const u = usersRepo.getOrCreate(ctx.from.id, defaultModel);
    for (const m of MODELS) {
      const marker = u.model === m.id ? "✅ " : "    ";
      range
        .text(`${marker}${m.label}`, async (ctx2) => {
          usersRepo.setModel(ctx2.from.id, m.id);
          await ctx2.answerCallbackQuery({ text: `🧀 Выбрано: ${m.label}` });
          ctx2.menu.update(); // re-render checkmark
        })
        .row();
    }
    range.back("⬅️ Назад");
  });
  return menu;
}
