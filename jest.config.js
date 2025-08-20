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
    // Prefer our msw CJS shim so tests receive a consistent runtime and
    // defensive wrappers (for request.json() etc.) are applied.
    '^msw$': '<rootDir>/src/test-utils/msw-cjs-shim.js',
    '^msw/node$': '<rootDir>/src/test-utils/msw-cjs-shim.js',
    '^msw/(.*)$': '<rootDir>/src/test-utils/msw-cjs-shim.js',
    // Ensure internal source imports (msw/src/...) resolve to compiled lib
    '^msw/src/(.*)$': '<rootDir>/node_modules/msw/lib/core/$1.js',
    // Ensure @mswjs/interceptors resolves to its node CJS build
    '^@mswjs/interceptors$': '<rootDir>/node_modules/@mswjs/interceptors/lib/node/index.js',
    '^@mswjs/interceptors/WebSocket$': '<rootDir>/node_modules/@mswjs/interceptors/lib/browser/interceptors/WebSocket/index.js',
    '^@mswjs/interceptors/ClientRequest$': '<rootDir>/node_modules/@mswjs/interceptors/lib/node/interceptors/ClientRequest/index.js',
    '^@mswjs/interceptors/fetch$': '<rootDir>/node_modules/@mswjs/interceptors/lib/node/interceptors/fetch/index.js',
    '^@mswjs/interceptors/XMLHttpRequest$': '<rootDir>/node_modules/@mswjs/interceptors/lib/node/interceptors/XMLHttpRequest/index.js',
    '^@mswjs/interceptors/(.*)$': '<rootDir>/node_modules/@mswjs/interceptors/lib/node/interceptors/$1/index.js',
    '^@mswjs/interceptors/src/(.*)$': '<rootDir>/node_modules/@mswjs/interceptors/lib/node/$1/index.js',
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
