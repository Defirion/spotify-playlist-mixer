// Global integration test setup: register centralized hook mocks to avoid
// duplicating vi.mock calls in every integration file.

// Provide simple default hook behavior; tests can still override by requiring
// the hooks module and inspecting the internal import('vitest').Mock (via _previewFn/_mixFn)
// Backwards-compatible registration of centralized hook mocks now located in
// `src/test-utils/mocks`.
// Ensure any direct requires of the centralized mock module resolve to the
// moved location under `src/test-utils/mocks`.
vi.mock('../test-utils/mocks/mixHooks', () =>
  require('../test-utils/mocks/mixHooks')
);

// Register default hook mocks used across integration tests
vi.mock('../hooks/useMixPreview', () =>
  require('../test-utils/mocks/mixHooks').makeUseMixPreviewModule()
);

vi.mock('../hooks/useMixGeneration', () =>
  require('../test-utils/mocks/mixHooks').makeUseMixGenerationModule()
);

// Note: Some tests still opt into MSW by calling setupMSW() themselves.

// Export a noop to make this file a valid module and avoid Jest treating it as
// a test file with zero tests when patterns pick it up.
export const __integration_setup_noop = () => {};

// Make this file a module so TypeScript's --isolatedModules option accepts it.
export {};

/* istanbul ignore next */
test('__setup_integration_noop', () => {});
