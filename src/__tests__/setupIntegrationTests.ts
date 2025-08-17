// Global integration test setup: register centralized hook mocks to avoid
// duplicating jest.mock calls in every integration file.

// Provide simple default hook behavior; tests can still override by requiring
// the hooks module and inspecting the internal jest.Mock (via _previewFn/_mixFn)
jest.mock('./mocks/mixHooks', () => require('./mocks/mixHooks'));

// Register default hook mocks used across integration tests
jest.mock('../hooks/useMixPreview', () =>
  require('./mocks/mixHooks').makeUseMixPreviewModule()
);

jest.mock('../hooks/useMixGeneration', () =>
  require('./mocks/mixHooks').makeUseMixGenerationModule()
);

// Note: Some tests still opt into MSW by calling setupMSW() themselves.

// Export a noop to make this file a valid module and avoid Jest treating it as
// a test file with zero tests when patterns pick it up.
export const __integration_setup_noop = () => {};

// Make this file a module so TypeScript's --isolatedModules option accepts it.
export {};

/* istanbul ignore next */
test.skip('__setup_integration_noop', () => {});
