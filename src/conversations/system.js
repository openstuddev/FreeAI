const CANCEL_TEXT = "Отмена ❌";

export function buildSystemConversation({ usersRepo }) {
  return async function system(conversation, ctx) {
    await ctx.reply(
      [
        "📝 Пришли новый system prompt одним сообщением.",
        `Передумал — «${CANCEL_TEXT}».`,
      ].join("\n")
    );

    const reply = await conversation.waitFor("message:text");
    const text = reply.message.text.trim();

    if (text === CANCEL_TEXT || text === "/cancel") {
      await ctx.reply("Откатил. Сыр цел.");
      return;
    }

    if (text.length > 4000) {
      await ctx.reply("🪤 Слишком длинно. Макс 4000. Подрежь и попробуй ещё.");
      return;
    }

    usersRepo.setSystemPrompt(ctx.from.id, text);
    await ctx.reply("🧀 Сохранил. Сыр запомнил твою инструкцию.");
  };
}
