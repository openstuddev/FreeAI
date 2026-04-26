const now = () => Date.now();

export function createUsersRepo(db) {
  const stmts = {
    get: db.prepare("SELECT * FROM users WHERE telegram_id = ?"),
    insert: db.prepare(`
      INSERT INTO users (telegram_id, model, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `),
    setToken: db.prepare(`
      UPDATE users SET puter_token = ?, puter_username = ?, updated_at = ?
      WHERE telegram_id = ?
    `),
    clearToken: db.prepare(`
      UPDATE users SET puter_token = NULL, puter_username = NULL, updated_at = ?
      WHERE telegram_id = ?
    `),
    setModel: db.prepare(`
      UPDATE users SET model = ?, updated_at = ? WHERE telegram_id = ?
    `),
    setSystemPrompt: db.prepare(`
      UPDATE users SET system_prompt = ?, updated_at = ? WHERE telegram_id = ?
    `),
    markSub: db.prepare(`
      UPDATE users SET subscription_verified_at = ?, updated_at = ? WHERE telegram_id = ?
    `),
    clearSub: db.prepare(`
      UPDATE users SET subscription_verified_at = NULL, updated_at = ? WHERE telegram_id = ?
    `),
  };

  return {
    get(telegramId) {
      return stmts.get.get(telegramId) ?? null;
    },

    getOrCreate(telegramId, defaultModel) {
      const existing = stmts.get.get(telegramId);
      if (existing) return existing;
      const ts = now();
      stmts.insert.run(telegramId, defaultModel, ts, ts);
      return stmts.get.get(telegramId);
    },

    setToken(telegramId, token, username) {
      stmts.setToken.run(token, username ?? null, now(), telegramId);
    },

    clearToken(telegramId) {
      stmts.clearToken.run(now(), telegramId);
    },

    setModel(telegramId, modelId) {
      stmts.setModel.run(modelId, now(), telegramId);
    },

    setSystemPrompt(telegramId, prompt) {
      stmts.setSystemPrompt.run(prompt, now(), telegramId);
    },

    clearSystemPrompt(telegramId) {
      stmts.setSystemPrompt.run(null, now(), telegramId);
    },

    markSubscriptionVerified(telegramId) {
      stmts.markSub.run(now(), now(), telegramId);
    },

    clearSubscriptionVerified(telegramId) {
      stmts.clearSub.run(now(), telegramId);
    },
  };
}
