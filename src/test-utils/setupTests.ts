import '../jest.polyfills';
import '@testing-library/jest-dom';
import { server } from './msw';

// Start MSW server for all tests globally
beforeAll(() => {
  if (!(global as any).__msw_server_started) {
    server.listen({ onUnhandledRequest: 'warn' });
    // Mark globally so individual tests that call setupMSW() can avoid
    // registering a second server.listen which leads to handlers running twice.
    (global as any).__msw_server_started = true;
  }
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

export {};
