// CommonJS shim for MSW used in Jest tests.
// Provides compatibility layer for MSW v2+ in Jest environment

// Install minimal globals required by MSW
if (typeof global.BroadcastChannel === 'undefined') {
  class BroadcastChannelPolyfill {
    constructor(name) {
      this.name = name;
      BroadcastChannelPolyfill._channels =
        BroadcastChannelPolyfill._channels || {};
      BroadcastChannelPolyfill._channels[name] =
        BroadcastChannelPolyfill._channels[name] || [];
      BroadcastChannelPolyfill._channels[name].push(this);
      this._listeners = [];
    }
    postMessage(message) {
      const subs = BroadcastChannelPolyfill._channels[this.name] || [];
      setTimeout(() => {
        for (const s of subs) {
          if (s === this) continue;
          const ev = { data: message };
          try {
            if (typeof s.onmessage === 'function') s.onmessage(ev);
          } catch (e) {}
          (s._listeners || []).forEach(l => {
            try {
              l(ev);
            } catch (e) {}
          });
        }
      }, 0);
    }
    addEventListener(type, handler) {
      if (type === 'message') this._listeners.push(handler);
    }
    removeEventListener(type, handler) {
      if (type === 'message')
        this._listeners = this._listeners.filter(h => h !== handler);
    }
    close() {
      BroadcastChannelPolyfill._channels[this.name] = (
        BroadcastChannelPolyfill._channels[this.name] || []
      ).filter(c => c !== this);
    }
  }
  global.BroadcastChannel = BroadcastChannelPolyfill;
}

if (typeof global.MessageEvent === 'undefined') {
  global.MessageEvent = class MessageEvent {
    constructor(type, init) {
      this.type = type;
      this.data = init && init.data;
    }
  };
}

// Basic Blob polyfill for MSW's HttpResponse.json() size checks
if (typeof global.Blob === 'undefined') {
  global.Blob = class Blob {
    constructor(parts = [], options = {}) {
      this.parts = parts;
      this.type = options && options.type ? String(options.type) : '';
    }
    get size() {
      let len = 0;
      for (const p of this.parts) {
        try {
          if (typeof p === 'string') {
            if (typeof Buffer !== 'undefined') len += Buffer.byteLength(p);
            else if (typeof TextEncoder !== 'undefined')
              len += new TextEncoder().encode(p).length;
            else len += p.length;
          } else if (p instanceof ArrayBuffer) len += p.byteLength;
          else if (ArrayBuffer.isView && ArrayBuffer.isView(p))
            len += p.byteLength;
          else if (p && typeof p.length === 'number') len += p.length;
        } catch (e) {
          // ignore
        }
      }
      return len;
    }
    async text() {
      const outs = [];
      for (const p of this.parts) {
        if (typeof p === 'string') outs.push(p);
        else if (p instanceof ArrayBuffer)
          outs.push(new TextDecoder().decode(new Uint8Array(p)));
        else if (ArrayBuffer.isView && ArrayBuffer.isView(p))
          outs.push(new TextDecoder().decode(new Uint8Array(p.buffer)));
        else outs.push(String(p));
      }
      return outs.join('');
    }
  };
}

// Load MSW - try different entry points for compatibility
let _msw = null;
try {
  // Prefer standard module resolution first
  _msw = require('msw');
} catch (e) {
  try {
    // Try package root by relative path (older setups)
    _msw = require('../../node_modules/msw');
  } catch (e2) {
    try {
      // Fallback to core bundle
      _msw = require('../../node_modules/msw/lib/core/index.js');
    } catch (e3) {
      try {
        // Last resort: try node bundle
        _msw = require('../../node_modules/msw/lib/node/index.js');
      } catch (e4) {
        // MSW not available or failed to load
      }
    }
  }
}

// Normalize ESM default export shape: some bundlers/exports put the real
// exports under the `default` key when required from CommonJS.
try {
  if (_msw && _msw.default && Object.keys(_msw.default).length) {
    _msw = _msw.default;
  }
} catch (e) {
  // ignore
}

// Add setupServer if not present
if (_msw && !_msw.setupServer) {
  try {
    const nodeExport = require('../../node_modules/msw/lib/node/index.js');
    if (nodeExport && nodeExport.setupServer) {
      _msw.setupServer = nodeExport.setupServer;
    }
  } catch (e) {
    // ignore
  }
}

// Create compatibility layer for v1 API (rest) if only v2 API (http) is available
if (_msw && !_msw.rest && _msw.http) {
  _msw.rest = _msw.http;
}

// Create compatibility layer for v2 API (http) if only v1 API (rest) is available
if (_msw && !_msw.http && _msw.rest) {
  _msw.http = _msw.rest;
}

// Final validation - if we have MSW but no rest/http, create a basic fallback
if (_msw && !_msw.rest && !_msw.http) {
  // Fallback handlers for missing rest/http
  const createHandler = method => (path, resolver) => {
    // Return a proper handler function that can be used with setupServer
    const handler = function (req, res, ctx) {
      return resolver(req, res, ctx);
    };

    // Add properties that MSW expects
    handler.info = {
      header: `${method.toUpperCase()} ${path}`,
      path,
      method: method.toUpperCase(),
    };

    // For regex paths
    if (path instanceof RegExp) {
      handler.test = (url, reqMethod) => {
        return (
          path.test(url) &&
          (method === 'all' || reqMethod.toLowerCase() === method.toLowerCase())
        );
      };
    } else {
      // For string paths
      handler.test = (url, reqMethod) => {
        return (
          url.includes(path) &&
          (method === 'all' || reqMethod.toLowerCase() === method.toLowerCase())
        );
      };
    }

    return handler;
  };

  _msw.rest = {
    get: createHandler('get'),
    post: createHandler('post'),
    put: createHandler('put'),
    patch: createHandler('patch'),
    delete: createHandler('delete'),
    head: createHandler('head'),
    options: createHandler('options'),
    all: createHandler('all'),
  };
  _msw.http = _msw.rest;
}

// Ensure setupServer is available from node submodule
if (_msw && !_msw.setupServer) {
  try {
    const nodeExports = require('msw/node');
    if (nodeExports && nodeExports.setupServer) {
      _msw.setupServer = nodeExports.setupServer;
    }
  } catch (e) {
    // Fallback: try direct path
    try {
      const nodeBundle = require('../../node_modules/msw/lib/node/index.js');
      if (nodeBundle && nodeBundle.setupServer) {
        _msw.setupServer = nodeBundle.setupServer;
      }
    } catch (e2) {
      // ignore
    }
  }
}

// Debug logging for Jest environment
if (process && process.env && process.env.JEST_WORKER_ID) {
  try {
    const keys = _msw ? Object.keys(_msw) : ['<no-msw>'];
    // eslint-disable-next-line no-console
    console.error('[msw-cjs-shim] loaded msw with keys:', keys.join(','));
    if (_msw && _msw.rest) {
      // eslint-disable-next-line no-console
      console.error(
        '[msw-cjs-shim] rest methods:',
        Object.keys(_msw.rest).join(',')
      );
    }
    if (_msw && _msw.http) {
      // eslint-disable-next-line no-console
      console.error(
        '[msw-cjs-shim] http methods:',
        Object.keys(_msw.http).join(',')
      );
    }
  } catch (e) {
    // ignore debug errors
  }
}

module.exports = _msw;
