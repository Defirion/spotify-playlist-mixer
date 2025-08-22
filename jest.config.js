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
  // Explicitly control which files to collect coverage from. CRA/react-scripts
  // sets a default; we override to exclude type-only files, index re-exports,
  // and declaration files which otherwise show up as 0% in reports.
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**',
    '!src/**/types.ts',
    '!src/**/type.ts',
    '!src/**/types.tsx',
    '!src/**/index.ts',
    '!src/**/index.tsx'
  ],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/src/__mocks__/fileMock.ts'
  },
  coveragePathIgnorePatterns: [
    '<rootDir>/src/jest.polyfills.ts',
    // entire types directory
    '<rootDir>/src/types/',
    // Type declaration files
    '\\.(d\\.ts)$',
    // Any file named `types.ts` or `type.ts`
    'types?\\.ts$',
    // Common index re-exports
    'index\\.(ts|tsx)$',
    '<rootDir>/tools/coverage_report.js',
    // keep explicit mixer ignores as a fallback
    '<rootDir>/src/utils/mixer/index\\.ts$',
    '<rootDir>/src/utils/mixer/types\\.ts$',
  ],
};
