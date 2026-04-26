import { Bot, session } from "grammy";
import { conversations, createConversation } from "@grammyjs/conversations";

import { buildMainMenu } from "./menus/main.js";
import { buildModelsMenu } from "./menus/models.js";
import { buildSystemMenu } from "./menus/system.js";
import { buildClearHistoryMenu } from "./menus/clear-history.js";
import { buildSubscriptionMenu } from "./menus/subscription.js";

import { buildLoginConversation } from "./conversations/login.js";
import { buildSystemConversation } from "./conversations/system.js";

import { buildStartHandler } from "./handlers/start.js";
import { buildChatHandler } from "./handlers/chat.js";
import { installErrorHandler } from "./handlers/errors.js";

import { createSubscriptionMiddleware } from "./middleware/subscription.js";

export function createBot({ config, db, usersRepo, messagesRepo, logger }) {
  const bot = new Bot(config.telegramBotToken);

  // ---- Plumbing: sessions (must be first) ----
  bot.use(session({ initial: () => ({}) }));

  // ---- Subscription gate menu MUST be installed BEFORE the gate middleware
  //      so users can click "Я подписался" without being blocked. The menu
  //      handler does its own subscription recheck.
  const subscriptionMenu = buildSubscriptionMenu(
    config.requiredChannel ?? "@privatekey_ai",
    { usersRepo }
  );
  bot.use(subscriptionMenu);

  // ---- Subscription gate (blocks everything below if not subscribed) ----
  bot.use(
    createSubscriptionMiddleware({
      channelHandle: config.requiredChannel,
      ttlMin: config.subscriptionCacheTtlMin,
      usersRepo,
      defaultModel: config.defaultModel,
      subscriptionMenu,
      logger,
    })
  );

  // ---- Conversations plugin (provides ctx.conversation API used by menus) ----
  bot.use(conversations());

  // ---- Build & register the main menu tree ----
  const mainMenu = buildMainMenu({ usersRepo, defaultModel: config.defaultModel });
  const modelsMenu = buildModelsMenu({ usersRepo, defaultModel: config.defaultModel });
  const systemMenu = buildSystemMenu({ usersRepo, defaultModel: config.defaultModel });
  const clearMenu = buildClearHistoryMenu({ messagesRepo });

  mainMenu.register(modelsMenu);
  mainMenu.register(systemMenu);
  mainMenu.register(clearMenu);

  bot.use(mainMenu);

  // ---- Register conversation handlers ----
  bot.use(createConversation(buildLoginConversation({ usersRepo }), "login"));
  bot.use(createConversation(buildSystemConversation({ usersRepo }), "system"));

  // ---- Build the start handler (also called by gate's "I subscribed") ----
  const startHandler = buildStartHandler({
    usersRepo,
    defaultModel: config.defaultModel,
    mainMenu,
  });
  // Expose for the gate's "✅ Я подписался" callback.
  bot.use(async (ctx, next) => {
    ctx.bot = { startHandler };
    return next();
  });

  bot.command("start", startHandler);

  const chatHandler = buildChatHandler({
    usersRepo,
    messagesRepo,
    historyMessages: config.historyMessages,
    defaultModel: config.defaultModel,
    logger,
  });
  bot.on("message:text", chatHandler);

  installErrorHandler(bot, logger);

  return bot;
}
