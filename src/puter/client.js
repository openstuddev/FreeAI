// MUST come before puter.js: stubs globalThis.WebSocket so puter's
// eager socket.io init doesn't crash when WS can't pass through our proxy.
import "./stub-websocket.js";
import { init } from "@heyputer/puter.js/src/init.cjs";

/**
 * Cache of token → puter client. Safe because tokens are opaque strings and
 * each user has exactly one token. Cache lives for the lifetime of the process.
 */
const clients = new Map();

export function getClientFor(token) {
  let client = clients.get(token);
  if (!client) {
    client = init(token);
    clients.set(token, client);
  }
  return client;
}

/** Test-only helper to reset the in-memory client cache. */
export function _resetCacheForTest() {
  clients.clear();
}

/**
 * Probe a token by asking Puter "who am I?". Returns { ok, username } or
 * { ok: false, error } where error is a short, user-safe string.
 */
export async function validateToken(token) {
  try {
    const client = getClientFor(token);
    const user = await client.auth.getUser();
    return { ok: true, username: user?.username ?? "unknown" };
  } catch (err) {
    // Wipe the broken client so we don't reuse it.
    clients.delete(token);
    return { ok: false, error: err?.message ?? "auth failed" };
  }
}

/**
 * Send a messages array to Puter and return plain text.
 * Throws on transport errors; callers are responsible for mapping to user UX.
 */
export async function askChat(token, messages, modelId) {
  const client = getClientFor(token);
  const resp = await client.ai.chat(messages, { model: modelId });
  return extractText(resp);
}

function extractText(resp) {
  if (!resp) return "";
  if (typeof resp === "string") return resp;
  if (typeof resp.message?.content === "string") return resp.message.content;
  if (typeof resp.text === "string") return resp.text;
  return String(resp);
}
