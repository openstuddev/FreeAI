const now = () => Date.now();

export function createMessagesRepo(db) {
  const insertOne = db.prepare(`
    INSERT INTO messages (telegram_id, role, content, created_at)
    VALUES (?, ?, ?, ?)
  `);

  const recordTx = db.transaction((telegramId, userText, assistantText) => {
    const ts = now();
    insertOne.run(telegramId, "user", userText, ts);
    insertOne.run(telegramId, "assistant", assistantText, ts);
  });

  const getRecentStmt = db.prepare(`
    SELECT role, content
    FROM messages
    WHERE telegram_id = ?
    ORDER BY id DESC
    LIMIT ?
  `);

  const deleteAllStmt = db.prepare(`
    DELETE FROM messages WHERE telegram_id = ?
  `);

  return {
    /** Atomic write of user→assistant pair after a successful AI call. */
    recordExchange(telegramId, userText, assistantText) {
      recordTx(telegramId, userText, assistantText);
    },

    /**
     * Returns up to `limit` most recent messages in CHRONOLOGICAL order
     * (oldest first), suitable for direct use as Puter `messages` array.
     */
    getRecent(telegramId, limit) {
      const rows = getRecentStmt.all(telegramId, limit);
      return rows.reverse();
    },

    deleteAll(telegramId) {
      deleteAllStmt.run(telegramId);
    },
  };
}
