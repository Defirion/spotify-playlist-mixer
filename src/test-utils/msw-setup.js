// Polyfill for TextEncoder/TextDecoder in Node.js environment
import { server } from '../mocks/server';

const { TextEncoder, TextDecoder } = require('util');

Object.assign(global, { TextEncoder, TextDecoder });

// Mock fetch for MSW
global.fetch = require('node-fetch');

// Establish API mocking before all tests.
beforeAll(() => server.listen());

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests.
afterEach(() => server.resetHandlers());

// Clean up after the tests are finished.
afterAll(() => server.close());
