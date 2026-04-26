const CANCEL_TEXT = "Отмена ❌";

export function buildSystemConversation({ usersRepo }) {
  return async function system(conversation, ctx) {
    await ctx.reply(
      [
        "⚙️ Пришли новый system prompt одним сообщением.",
        `Чтобы прервать — отправь «${CANCEL_TEXT}».`,
      ].join("\n")
    );

    const reply = await conversation.waitFor("message:text");
    const text = reply.message.text.trim();

    if (text === CANCEL_TEXT || text === "/cancel") {
      await ctx.reply("Отменено.");
      return;
    }

    if (text.length > 4000) {
      await ctx.reply("Слишком длинно (макс 4000). Сократи и пришли ещё раз через меню.");
      return;
    }

    usersRepo.setSystemPrompt(ctx.from.id, text);
    await ctx.reply("✅ System prompt сохранён.");
  };
}
