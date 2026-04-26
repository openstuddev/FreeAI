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
