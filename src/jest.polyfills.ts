// Nuclear polyfill: force a CommonJS-friendly fetch and headers implementation
// for Jest tests. This sets globals so MSW and tests can rely on stable APIs.
/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any */
try {
  // Ensure TextEncoder/TextDecoder exist (some Node/Jest environments lack them,
  // and MSW/@mswjs/interceptors buffer utilities rely on them).
  try {
    if (
      typeof (global as any).TextEncoder === 'undefined' ||
      typeof (global as any).TextDecoder === 'undefined'
    ) {
      // Prefer Node's util.TextEncoder/TextDecoder when available
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
        const { TextEncoder: _TE, TextDecoder: _TD } = require('util');
        if (typeof (global as any).TextEncoder === 'undefined' && _TE)
          (global as any).TextEncoder = _TE;
        if (typeof (global as any).TextDecoder === 'undefined' && _TD)
          (global as any).TextDecoder = _TD;
      } catch (e) {
        // Fallback lightweight polyfills using Buffer
        if (typeof (global as any).TextEncoder === 'undefined') {
          (global as any).TextEncoder = class TextEncoder {
            encode(input: string) {
              return Buffer.from(String(input), 'utf8');
            }
          } as any;
        }
        if (typeof (global as any).TextDecoder === 'undefined') {
          (global as any).TextDecoder = class TextDecoder {
            decode(input: Uint8Array | ArrayBuffer) {
              try {
                const buf = Buffer.isBuffer(input)
                  ? input
                  : Buffer.from(input as any);
                return buf.toString('utf8');
              } catch (e) {
                return String(input);
              }
            }
          } as any;
        }
      }
    }
  } catch (e) {
    // ignore polyfill failures
  }
  // Minimal BroadcastChannel polyfill used by MSW's internal pub/sub when
  // running in environments without a real BroadcastChannel (like older
  // jsdom/node versions). Implements a process-global channel map so
  // different channel names can communicate within the same test process.
  try {
    if (typeof (global as any).BroadcastChannel === 'undefined') {
      const channels: Record<string, Set<any>> = {};
      (global as any).BroadcastChannel = class BroadcastChannel {
        name: string;
        onmessage: ((ev: any) => void) | null = null;
        constructor(name: string) {
          this.name = name;
          channels[name] = channels[name] || new Set();
          channels[name].add(this);
        }
        postMessage(message: any) {
          const subs = channels[this.name];
          if (!subs) return;
          for (const sub of Array.from(subs)) {
            if (sub === this) continue;
            try {
              if (typeof sub.onmessage === 'function')
                sub.onmessage({ data: message });
            } catch (e) {
              // swallow
            }
          }
        }
        close() {
          const subs = channels[this.name];
          if (subs) subs.delete(this);
        }
        addEventListener() {}
        removeEventListener() {}
      };
    }
  } catch (e) {
    // ignore BroadcastChannel polyfill failures
  }
  // Prefer node-fetch v2 (CommonJS). If present, use its exports. If not,
  // fall back to minimal shims that make failures explicit.
  try {
    // eslint-disable-next-line global-require
    const nf = require('node-fetch');
    (global as any).fetch = nf;
    (global as any).Request = nf.Request || (function Request() {} as any);
    (global as any).Response = nf.Response || (function Response() {} as any);
    (global as any).Headers =
      nf.Headers ||
      (function Headers(init: any) {
        return new Map(Object.entries(init || {}));
      } as any);
  } catch (e) {
    // Last-resort minimal fetch shim that throws when used so tests fail fast and explicitly.
    (global as any).fetch = async () => {
      throw new Error(
        'global.fetch not available: install node-fetch@2 or use Node 18+'
      );
    };
    (global as any).Request = function Request() {} as any;
    (global as any).Response = function Response() {} as any;
    (global as any).Headers = function Headers() {
      return { all: () => [] };
    } as any;
  }

  // Ensure a minimal Response class exists with json/text used by tests
  if (
    typeof (global as any).Response === 'undefined' ||
    typeof (global as any).Response !== 'function'
  ) {
    (global as any).Response = class Response {
      body: any;
      status: number;
      headers: any;
      constructor(body: any = null, init: any = {}) {
        this.body = body;
        this.status =
          init && typeof init.status === 'number' ? init.status : 200;
        this.headers = init && init.headers ? init.headers : {};
      }
      async json() {
        if (typeof this.body === 'string') return JSON.parse(this.body);
        return this.body;
      }
      async text() {
        if (typeof this.body === 'string') return this.body;
        return JSON.stringify(this.body);
      }
    } as any;
  }

  // Ensure Headers.prototype.all exists for legacy code paths
  try {
    const H = (global as any).Headers;
    if (H && H.prototype && !H.prototype.all) {
      // eslint-disable-next-line no-extend-native
      H.prototype.all = function (name?: string) {
        const out: Record<string, string[]> = {};
        if (typeof this.forEach === 'function') {
          this.forEach((value: string, key: string) => {
            if (!name || key === name) {
              if (!out[key]) out[key] = [];
              out[key].push(value);
            }
          });
        } else if (typeof this.raw === 'function') {
          const raw = this.raw();
          Object.keys(raw).forEach(k => {
            out[k] = Array.isArray(raw[k]) ? raw[k] : [String(raw[k])];
          });
        }
        return name ? out[name] || [] : out;
      };
    }
  } catch (e) {
    // ignore
  }

  // Wrap global.fetch so that any Response returned has headers.all() available
  // and plain response-like objects returned by MSW/interceptors are wrapped
  // into a real Response instance that implements json()/text().
  try {
    // capture the current fetch implementation
    // @ts-ignore
    const origFetch = (global as any).fetch;
    if (typeof origFetch === 'function') {
      (global as any).fetch = async function (...args: any[]) {
        const res = await origFetch.apply(this, args);

        // normalize headers: ensure an .all() helper exists
        try {
          if (res && res.headers && typeof res.headers.all !== 'function') {
            (res.headers as any).all = function (name?: string) {
              const out: Record<string, string[]> = {};
              if (typeof this.forEach === 'function') {
                this.forEach((value: string, key: string) => {
                  if (!name || key === name) {
                    if (!out[key]) out[key] = [];
                    out[key].push(value as string);
                  }
                });
              } else if (typeof this.raw === 'function') {
                const raw = this.raw();
                Object.keys(raw).forEach(k => {
                  out[k] = Array.isArray(raw[k]) ? raw[k] : [String(raw[k])];
                });
              }
              return name ? out[name] || [] : out;
            };
          }
        } catch (e) {
          // ignore header normalization errors
        }

        // If MSW/interceptors returned a plain response-like object (with
        // `body` and/or `status`) but no `.json()` method, wrap it into the
        // global Response polyfill so callers can call res.json()/res.text().
        try {
          // If the value returned by fetch is not a proper Response (missing
          // .json), wrap it into our global Response polyfill so callers can
          // consistently use res.json()/res.text(). Use res.body when present
          // otherwise use the whole object as the body.
          if (
            res &&
            typeof res.json !== 'function' &&
            typeof (global as any).Response === 'function'
          ) {
            try {
              // diagnostic: print keys so we can learn why json() is missing
              // eslint-disable-next-line no-console
              console.error(
                '[fetch wrapper] wrapping non-Response object, keys:',
                res && typeof res === 'object' ? Object.keys(res) : typeof res
              );
              try {
                // eslint-disable-next-line no-console
                console.error(
                  '[fetch wrapper] constructor:',
                  res && res.constructor && res.constructor.name
                );
                try {
                  // eslint-disable-next-line no-console, global-require
                  console.error(
                    '[fetch wrapper] inspect:',
                    require('util').inspect(res, { depth: 2 })
                  );
                } catch (e) {}
              } catch (e) {}

              const collectStream = async (stream: any) => {
                return await new Promise<string | null>(resolve => {
                  try {
                    const chunks: any[] = [];
                    stream.on('data', (c: any) =>
                      chunks.push(
                        Buffer.isBuffer(c) ? c : Buffer.from(String(c))
                      )
                    );
                    stream.on('end', () => {
                      try {
                        resolve(Buffer.concat(chunks).toString('utf8'));
                      } catch (e) {
                        resolve(null);
                      }
                    });
                    stream.on('error', () => resolve(null));
                  } catch (e) {
                    resolve(null);
                  }
                });
              };

              const body = typeof res.body !== 'undefined' ? res.body : res;
              const headers = res && res.headers ? res.headers : {};
              const status =
                res && typeof res.status === 'number' ? res.status : 200;
              try {
                // If body is a Node readable stream, collect it into text first.
                if (
                  body &&
                  typeof body === 'object' &&
                  typeof body.on === 'function'
                ) {
                  const text = await collectStream(body);
                  if (text !== null)
                    return new (global as any).Response(text, {
                      status,
                      headers,
                    });
                }
                return new (global as any).Response(body, { status, headers });
              } catch (e) {
                // fall back to original res
              }
            } catch (e) {
              // fall back to original res
            }
          }
        } catch (e) {
          // swallow
        }

        // Debug: if response lacks .json(), print available keys to help
        // diagnose why tests see undefined json() on responses from MSW.
        try {
          if (res && typeof res.json !== 'function') {
            // eslint-disable-next-line no-console
            console.error(
              '[debug][fetch wrapper] response missing json(), keys:',
              res && typeof res === 'object' ? Object.keys(res) : typeof res,
              'has body:',
              typeof res.body !== 'undefined',
              'has status:',
              typeof res.status !== 'undefined'
            );
          }
        } catch (e) {
          // ignore
        }

        return res;
      };
    }
  } catch (e) {
    // ignore
  }

  // Minimal Blob polyfill used by MSW's HttpResponse.size calculations.
  try {
    if (typeof (global as any).Blob === 'undefined') {
      (global as any).Blob = class Blob {
        parts: any[];
        type: string;
        constructor(parts: any[] = [], options: any = {}) {
          this.parts = parts;
          this.type = options && options.type ? String(options.type) : '';
        }
        get size() {
          let len = 0;
          for (const p of this.parts) {
            try {
              if (typeof p === 'string') {
                if (typeof Buffer !== 'undefined') {
                  len += Buffer.byteLength(p);
                } else if (typeof TextEncoder !== 'undefined') {
                  len += new TextEncoder().encode(p).length;
                } else {
                  len += p.length;
                }
              } else if (p instanceof ArrayBuffer) {
                len += p.byteLength;
              } else if (ArrayBuffer.isView && ArrayBuffer.isView(p)) {
                len += p.byteLength;
              } else if (p && typeof p.length === 'number') {
                len += p.length;
              }
            } catch (e) {
              // best-effort; ignore parts we can't measure
            }
          }
          return len;
        }
        async text() {
          const outs: string[] = [];
          for (const p of this.parts) {
            if (typeof p === 'string') outs.push(p);
            else if (p instanceof ArrayBuffer)
              outs.push(new TextDecoder().decode(new Uint8Array(p)));
            else if (ArrayBuffer.isView && ArrayBuffer.isView(p))
              outs.push(
                new TextDecoder().decode(new Uint8Array((p as any).buffer))
              );
            else outs.push(String(p));
          }
          return outs.join('');
        }
      } as any;
    }
  } catch (e) {
    // ignore polyfill failures
  }

  // ------------------ Minimal Streams (TransformStream / ReadableStream / WritableStream) ------------------
  try {
    if (!(global as any).TransformStream) {
      (global as any).TransformStream = class TransformStream {
        readable: any;
        writable: any;
        constructor() {
          const chunks: any[] = [];
          let closed = false;
          this.readable = new (global as any).ReadableStream({
            start(controller: any) {
              (this as any)._controller = controller;
            },
          });
          this.writable = new (global as any).WritableStream({
            write: async (chunk: any) => {
              try {
                const reader =
                  (this as any).readable && (this as any).readable._controller;
                if (reader && typeof reader.enqueue === 'function') {
                  reader.enqueue(chunk);
                } else if (!closed) {
                  chunks.push(chunk);
                }
              } catch (e) {
                // swallow
              }
            },
            close: async () => {
              closed = true;
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
          return { read: async () => ({ done: true }) };
        }
      };
    }

    if (!(global as any).WritableStream) {
      (global as any).WritableStream = class WritableStream {
        getWriter() {
          return { write: async () => {}, close: async () => {} };
        }
      };
    }
  } catch (e) {
    // ignore stream polyfill failures
  }

  // Minimal MessageEvent polyfill (jsdom may not provide this in some setups)
  try {
    if (typeof (global as any).MessageEvent === 'undefined') {
      (global as any).MessageEvent = class MessageEvent {
        type: string;
        data: any;
        origin: string;
        ports: any[];
        lastEventId: string;
        constructor(type: string, init: any = {}) {
          this.type = type;
          this.data = init.data;
          this.origin = init.origin || '';
          this.ports = init.ports || [];
          this.lastEventId = init.lastEventId || '';
        }
      };
    }
  } catch (e) {
    // ignore
  }

  // Minimal CookieStore polyfill for MSW v2+ compatibility
  try {
    if (typeof (global as any).CookieStore === 'undefined') {
      (global as any).CookieStore = class CookieStore extends EventTarget {
        async get() {
          return null;
        }
        async getAll() {
          return [];
        }
        async set() {
          // no-op
        }
        async delete() {
          // no-op
        }
      };
    }
  } catch (e) {
    // ignore
  }

  // Ensure tough-cookie Store class is available globally for MSW
  try {
    if (typeof (global as any).Store === 'undefined') {
      const toughCookie = require('@bundled-es-modules/tough-cookie');
      if (toughCookie && toughCookie.Store) {
        (global as any).Store = toughCookie.Store;
      } else {
        // Fallback minimal Store class
        (global as any).Store = class Store {
          constructor() {}
          findCookie() {
            return null;
          }
          findCookies() {
            return [];
          }
          putCookie() {}
          updateCookie() {}
          removeCookie() {}
          removeCookies() {}
          removeAllCookies() {}
          getAllCookies() {
            return [];
          }
        };
      }
    }
  } catch (e) {
    // Fallback minimal Store class
    try {
      if (typeof (global as any).Store === 'undefined') {
        (global as any).Store = class Store {
          constructor() {}
          findCookie() {
            return null;
          }
          findCookies() {
            return [];
          }
          putCookie() {}
          updateCookie() {}
          removeCookie() {}
          removeCookies() {}
          removeAllCookies() {}
          getAllCookies() {
            return [];
          }
        };
      }
    } catch (e2) {
      // ignore
    }
  }

  // Minimal CacheStorage polyfill for MSW compatibility
  try {
    if (typeof (global as any).CacheStorage === 'undefined') {
      (global as any).CacheStorage = class CacheStorage {
        async open() {
          return {
            match: async () => undefined,
            add: async () => {},
            addAll: async () => {},
            put: async () => {},
            delete: async () => false,
            keys: async () => [],
          };
        }
        async has() {
          return false;
        }
        async delete() {
          return false;
        }
        async keys() {
          return [];
        }
      };
      (global as any).caches = new (global as any).CacheStorage();
    }
  } catch (e) {
    // ignore
  }
} catch (err) {
  // If anything goes wrong at module load, surface the error so test startup fails loudly.
  // eslint-disable-next-line no-console
  console.error('Failed to initialize jest.polyfills:', err);
  throw err;
}

export {};
