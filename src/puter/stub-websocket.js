/**
 * Side-effect module. MUST be imported before `puter.js/src/init.cjs`.
 *
 * puter.js's FileSystem submodule eagerly opens a socket.io connection
 * inside its `init()` (FileSystem/index.js:97), regardless of whether the
 * caller ever touches the filesystem API. When that socket.io's WebSocket
 * transport fails to connect (typical when we route traffic through an
 * HTTPS proxy that doesn't tunnel WS), puter.js's own socket.io wrapper
 * has buggy error handling: `onError → close → onClose → close → onError`
 * cascades into a `RangeError: Maximum call stack size exceeded` and
 * crashes the bot.
 *
 * We don't use puter's filesystem at all, so the cleanest fix is to make
 * `globalThis.WebSocket` a no-op stub before puter.js's vm context picks
 * it up. socket.io will fail to upgrade silently and either fall back to
 * polling (also dead — fine) or just sit idle, but won't crash anything.
 */

class StubWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  constructor() {
    this.readyState = StubWebSocket.CLOSED;
    this.url = "";
    this.protocol = "";
    this.extensions = "";
    this.bufferedAmount = 0;
    this.binaryType = "blob";
    this.onopen = null;
    this.onmessage = null;
    this.onerror = null;
    this.onclose = null;
  }

  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() { return true; }
  send() {}
  close() {}
}

// Only stub if we're in Node (don't touch real WebSocket in browsers, etc.).
if (typeof process !== "undefined" && process.versions && process.versions.node) {
  globalThis.WebSocket = StubWebSocket;
}
