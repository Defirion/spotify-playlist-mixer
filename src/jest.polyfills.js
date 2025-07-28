// Jest polyfills for Node.js environment
// This file must be imported before any MSW imports

const { TextEncoder, TextDecoder } = require('util');

// Set up TextEncoder/TextDecoder polyfills
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Set up fetch polyfill for MSW
if (!global.fetch) {
  global.fetch = require('node-fetch');
}

// Set up other Web APIs that might be needed
global.Request = global.Request || require('node-fetch').Request;
global.Response = global.Response || require('node-fetch').Response;
global.Headers = global.Headers || require('node-fetch').Headers;

// TransformStream polyfill for Node.js
if (!global.TransformStream) {
  global.TransformStream = class TransformStream {
    constructor(transformer = {}) {
      const { transform, flush } = transformer;

      this.readable = new ReadableStream({
        start(controller) {
          this._controller = controller;
        },
      });

      this.writable = new WritableStream({
        write: async chunk => {
          if (transform) {
            await transform(chunk, this.readable._controller);
          } else {
            this.readable._controller.enqueue(chunk);
          }
        },
        close: async () => {
          if (flush) {
            await flush(this.readable._controller);
          }
          this.readable._controller.close();
        },
      });
    }
  };
}

// ReadableStream polyfill for Node.js
if (!global.ReadableStream) {
  global.ReadableStream = class ReadableStream {
    constructor(source = {}) {
      this._source = source;
      this._controller = null;
      this._started = false;
    }

    getReader() {
      return {
        read: async () => {
          if (!this._started && this._source.start) {
            this._controller = {
              enqueue: chunk => this._chunks.push(chunk),
              close: () => (this._closed = true),
              error: err => (this._error = err),
            };
            this._chunks = [];
            this._closed = false;
            this._error = null;
            await this._source.start(this._controller);
            this._started = true;
          }

          if (this._error) {
            throw this._error;
          }

          if (this._chunks.length > 0) {
            return { value: this._chunks.shift(), done: false };
          }

          if (this._closed) {
            return { done: true };
          }

          return { done: true };
        },
      };
    }
  };
}

// WritableStream polyfill for Node.js
if (!global.WritableStream) {
  global.WritableStream = class WritableStream {
    constructor(sink = {}) {
      this._sink = sink;
    }

    getWriter() {
      return {
        write: async chunk => {
          if (this._sink.write) {
            await this._sink.write(chunk);
          }
        },
        close: async () => {
          if (this._sink.close) {
            await this._sink.close();
          }
        },
      };
    }
  };
}
