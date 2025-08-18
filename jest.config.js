module.exports = {
  // Load our setupTests file for jest (testing-library matchers, global helpers)
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  testEnvironment: 'jsdom',
  // Ignore legacy helper locations that may live under __tests__ and are not
  // meant to be test suites. This avoids deleting files and fixes CI/Jest
  // discovery on Windows where deletes can be flaky.
  testPathIgnorePatterns: ['<rootDir>/src/__tests__/mocks/', '<rootDir>/src/__tests__/_moved_helpers/', '<rootDir>/src/test-utils/_moved_helpers/'],
  // Allow transforming ESM dependencies that ship modern syntax (msw, axios, etc.)
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@bundled-es-modules|msw|@mswjs|axios|undici|whatwg-fetch)/)'
  ],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/src/__mocks__/fileMock.js'
  }
};
