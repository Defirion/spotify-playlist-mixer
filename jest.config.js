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
    'node_modules/(?!(?:@bundled-es-modules|undici|whatwg-fetch)/)'
  ],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/src/__mocks__/fileMock.ts',
  // (Legacy MSW mappings removed earlier)
    // Bundled ESM -> CJS shims for a few bundled-es-modules

  },
};
