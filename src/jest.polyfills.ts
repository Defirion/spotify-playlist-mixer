/**
 * src/jest.polyfills.ts
 *
 * Purpose:
 * - Provide minimal browser-like globals that tests (and MSW) expect when running under Node.
 * - This file must be imported before any code that depends on these globals (see `src/test-utils/msw-setup.ts`).
 *
 * Notes:
 * - Keep these shims minimal and defensive: only set globals when they don't already exist.
 * - Prefer native implementations (Node 18+ has global `fetch`) and prefer `undici` as a server-side fetch polyfill.
 * - Avoid redeclaring DOM types (TextEncoder/TextDecoder) to prevent TypeScript/lib.dom collisions.
 *
 * Tests that rely on these polyfills (non-exhaustive):
 * - MSW-based API tests (import `src/test-utils/msw-setup.ts`) rely on `fetch`, `Request`, `Response`, and `Headers`.
 * - Any streaming-related tests may rely on ReadableStream/TransformStream/ WritableStream shims.
 */

// ------------------ TextEncoder / TextDecoder ------------------
// Reuse the runtime's TextEncoder/TextDecoder if present; do not redeclare the global
// names to avoid TypeScript collisions with lib.dom.d.ts.
try {
  const util = require('util');
  const NativeTextEncoder =
    (global as any).TextEncoder ||
    util.TextEncoder ||
    require('util').TextEncoder;
  const NativeTextDecoder =
    (global as any).TextDecoder ||
    util.TextDecoder ||
    require('util').TextDecoder;
  if (NativeTextEncoder) (global as any).TextEncoder = NativeTextEncoder;
  if (NativeTextDecoder) (global as any).TextDecoder = NativeTextDecoder;
} catch (e) {
  // If none available, leave undefined — tests that need them will fail and surface the requirement.
}

// ------------------ fetch / Request / Response / Headers ------------------
// Prefer existing global fetch (Node 18+). Otherwise, try to wire `undici` (recommended),
// then fall back to `node-fetch` only if available. Avoid throwing here so test startup doesn't crash.
if (typeof (global as any).fetch === 'undefined') {
  try {
    // undici is recommended for server-side fetch compatibility and performance.
    const undici = require('undici');
    if (undici && typeof undici.fetch === 'function') {
      (global as any).fetch = undici.fetch;
      (global as any).Request = undici.Request;
      (global as any).Response = undici.Response;
      (global as any).Headers = undici.Headers;
    }
  } catch (eUndici) {
    try {
      // Fallback: node-fetch (v2 works with CommonJS requires). v3 is ESM-only and will not be required safely.
      const nodeFetch = require('node-fetch');
      (global as any).fetch = nodeFetch;
      (global as any).Request = nodeFetch.Request;
      (global as any).Response = nodeFetch.Response;
      (global as any).Headers = nodeFetch.Headers;
    } catch (eNodeFetch) {
      // No fetch polyfill available; tests that need fetch will fail and make the requirement explicit.
    }
  }
}

// ------------------ Minimal Streams (TransformStream / ReadableStream / WritableStream) ------------------
// These are intentionally minimal shims to satisfy tests or libraries that check the presence of these globals.
// They do NOT fully implement the WHATWG Streams spec. If you need full streaming behavior, replace with
// a proper polyfill or run tests in a browser-like environment.
if (!(global as any).TransformStream) {
  (global as any).TransformStream = class TransformStream {
    readable: any;
    writable: any;
    constructor() {
      this.readable = new (global as any).ReadableStream({
        start: (controller: any) => {
          (this as any)._controller = controller;
        },
      });
      this.writable = new (global as any).WritableStream({
        write: async (chunk: any) => {
          (this as any)._controller.enqueue(chunk);
        },
        close: async () => {
          (this as any)._controller.close();
        },
      });
    }
  };
}

if (!(global as any).ReadableStream) {
  (global as any).ReadableStream = class ReadableStream {
    _controller: any;
    constructor(source: any = {}) {
      this._controller = null;
      if (source && source.start) {
        source.start({
          enqueue: (v: any) => {
            if (this._controller) this._controller.enqueue(v);
          },
          close: () => {
            if (this._controller) this._controller.close();
          },
        });
      }
    }
    getReader() {
      return {
        read: async () => ({ done: true }),
      };
    }
  };
}

if (!(global as any).WritableStream) {
  (global as any).WritableStream = class WritableStream {
    getWriter() {
      return {
        write: async () => {},
        close: async () => {},
      };
    }
  };
}

// Make this file a module for isolatedModules + TypeScript builds
export {};
// Note: axios <-> MSW compatibility normalization used to live here as a
// test-time global shim. That global monkey-patch has been removed and the
// normalization is now applied per-axios-instance in `src/utils/spotify.ts`.
// Keeping polyfills minimal in this file avoids test-time global side effects.
