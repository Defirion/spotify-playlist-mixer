// MSW test setup utility
// Import this in tests that need API mocking

// Import Jest polyfills first (required for MSW)
import '../jest.polyfills.js';
import { server } from '../mocks/server';

// Setup function for tests that need MSW
export const setupMSW = () => {
  beforeAll(() => {
    server.listen({
      onUnhandledRequest: 'warn',
    });
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });
};

// Export server for custom handler setup in tests
export { server };
