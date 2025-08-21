module.exports = {
  setupFiles: ['<rootDir>/src/jest.polyfills.ts'],
  // Use the repository's top-level `src/setupTests.ts` which registers
  // global test helpers (for example `silenceIfPass`) and jest mocks.
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: ['<rootDir>/src/__tests__/mocks/', '<rootDir>/src/__tests__/_moved_helpers/', '<rootDir>/src/test-utils/_moved_helpers/'],
  modulePathIgnorePatterns: ['<rootDir>\\.worktrees'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(?:@bundled-es-modules|@mswjs|undici|whatwg-fetch)/)'
  ],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/src/__mocks__/fileMock.ts',
  // (MSW mappings removed)
    // Bundled ESM -> CJS shims for MSW dependencies
    '.*@bundled-es-modules/statuses/index-esm\\.js$': '<rootDir>/src/test-utils/statuses-cjs-shim.js',
    '.*@bundled-es-modules/statuses.*': '<rootDir>/src/test-utils/statuses-cjs-shim.js',
    '.*@bundled-es-modules/tough-cookie/index-esm\\.js$': '<rootDir>/src/test-utils/tough-cookie-cjs-shim.js',
    '.*@bundled-es-modules/tough-cookie.*': '<rootDir>/src/test-utils/tough-cookie-cjs-shim.js',
    '.*@bundled-es-modules/cookie/index-esm\\.js$': '<rootDir>/src/test-utils/cookie-cjs-shim.js',
    '.*@bundled-es-modules/cookie.*': '<rootDir>/src/test-utils/cookie-cjs-shim.js',
    // General bundled-es-modules shims
    '^@bundled-es-modules/statuses$': '<rootDir>/src/test-utils/statuses-cjs-shim.js',
    '^@bundled-es-modules/tough-cookie$': '<rootDir>/src/test-utils/tough-cookie-cjs-shim.js',
    '^@bundled-es-modules/cookie$': '<rootDir>/src/test-utils/cookie-cjs-shim.js',
  },
};
