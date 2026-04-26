const SUBSCRIBED_STATUSES = new Set([
  "creator",
  "administrator",
  "member",
  "restricted",
]);

export function isSubscribedStatus(status) {
  return SUBSCRIBED_STATUSES.has(status);
}

/**
 * @param verifiedAt unix ms when subscription was last confirmed (or null)
 * @param ttlMin     cache TTL in minutes (0 = always stale)
 * @param now        unix ms (injectable for tests)
 */
export function isCacheFresh(verifiedAt, ttlMin, now = Date.now()) {
  if (!verifiedAt || ttlMin <= 0) return false;
  return now - verifiedAt < ttlMin * 60_000;
}

/**
 * Canonical gate prompt. Shown both by the subscription middleware (first
 * time the user is gated) AND by the gate menu callback when the user
 * taps "✅ Я подписался" without actually being subscribed — re-sending
 * the same prompt is the expected UX.
 */
export function gateMessageText(channelHandle) {
  return [
    "🪤 Сыра нет.",
    "",
    `Сначала подпишись на канал, потом возвращайся: 📢 ${channelHandle}`,
    "",
    "После — жми «✅ Я подписался».",
  ].join("\n");
}
