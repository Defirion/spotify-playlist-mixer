# Test Infrastructure Repair Implementation Plan

## Phase 1: Audit and Safety Gates

- [x] 1. Audit MSW handler files and imports



  - Find all MSW handler files in the codebase
  - List all imports of handler files across test files
  - Identify all references to "tracks.items" vs "playlists.items" in tests
  - Document current MSW setup patterns across different test files
  - Check Jest bootstrap locations (setupTests.ts, jest.config.js, jest.polyfills.ts)
  - Identify tests that relied on tolerant fallback behavior
  - _Requirements: 1.1, 3.1, 4.1_

- [x] 2. Add JSON serializability gate test
  - Create unit test that runs JSON.stringify on all MSW fixture objects
  - Test for circular references, DOM nodes, Date objects, Map instances
  - Add this as automated gate before main test runs
  - Fix any non-serializable objects found immediately
  - _Requirements: 1.1, 1.3_

- [x] 3. Create MSW environment safety rules






  - Document Node vs browser MSW usage (setupServer vs worker)
  - Add rule to never call both setupServer and worker in same bootstrap
  - Ensure tests running in Node use setupServer only
  - Verify no browser MSW worker setup in Jest environment
  - _Requirements: 1.4, 4.1_

## Phase 2: Fix MSW Handler Consolidation

- [ ] 4. Create canonical MSW handlers with backup safety
  - Backup existing handler files as .backup extensions
  - Create canary test that hits canonical handler before bulk edits
  - Consolidate all handlers into single src/mocks/handlers.ts file
  - Ensure all handlers return playlists.items format for search endpoints
  - Remove duplicate handler file src/test-utils/mocks/mswHandlers.ts
  - _Requirements: 3.1, 3.2, 4.2_

- [ ] 5. Sanitize all fixture objects with validation
  - Convert all fixture objects to plain JSON-serializable POJOs
  - Remove any DOM/window references, Date objects, Map instances from mock data
  - Test all fixtures with JSON.stringify to ensure serializability
  - Add lightweight runtime schema validation for handler responses
  - Update any tests that depend on non-serializable fixture properties
  - _Requirements: 1.1, 1.3_

## Phase 3: Standardize MSW Setup

- [ ] 6. Create single MSW setup pattern with Jest config
  - Update src/test-utils/msw-setup.ts to be the single MSW setup source
  - Configure setupFilesAfterEnv in Jest config to point to canonical setup
  - Remove MSW setup calls from individual test files
  - Ensure setupServer is used for Node/Jest environment only
  - Add proper cleanup between tests in setup file
  - _Requirements: 1.4, 4.1, 4.3_

- [ ] 7. Update all test files to use standard MSW setup
  - Replace direct MSW imports with msw-setup.ts import
  - Remove duplicate beforeAll/afterAll MSW setup calls
  - Ensure consistent MSW initialization across all test files
  - Test that MSW setup doesn't conflict between test files
  - Verify CI/Dev parity for Jest config and env vars
  - _Requirements: 4.1, 4.2, 4.3_

## Phase 4: Fix Search Functionality

- [ ] 8. Update usePlaylistSearch hook with validation
  - Remove fallback to response.data.tracks.items
  - Add lightweight schema validation for response.data.playlists structure
  - Return empty results for malformed API responses with clear error messages
  - Add proper error handling for unexpected response shapes
  - Add migration tests for removed tolerant fallback behavior
  - _Requirements: 2.1, 2.3, 3.2_

- [ ] 9. Create comprehensive response validation tests
  - Test usePlaylistSearch with correct playlists.items response
  - Test graceful handling of malformed API responses
  - Test error scenarios with missing playlists property
  - Add regression test that JSON.stringify works on all handler responses
  - Test TypeScript impact if any exported types were removed
  - _Requirements: 2.2, 2.3, 3.2_

## Phase 5: Restore Integration Tests

- [ ] 10. Fix integration test search workflows incrementally
  - Run targeted Spotify-related tests in-band first
  - Update integration tests to expect correct MSW response format
  - Ensure search results appear properly in UI tests
  - Fix any tests that relied on old tracks.items fallback behavior
  - Verify end-to-end search workflow works with consolidated handlers
  - _Requirements: 2.1, 5.2, 5.3_

- [ ] 11. Run full test suite validation with monitoring
  - Execute npm test --runInBand to avoid worker conflicts
  - Verify no Jest worker crashes or circular JSON errors
  - Confirm integration tests find expected UI elements
  - Ensure test coverage returns to previous levels
  - Monitor for any external script dependencies on removed configurations
  - _Requirements: 1.1, 1.2, 5.1, 5.4_

## Phase 6: Clean Up and Regression Prevention

- [ ] 12. Remove backup files and clean up safely
  - Delete .backup handler files once tests pass
  - Remove any temporary test files created during migration
  - Update any documentation that references old handler patterns
  - Verify no external scripts depend on removed configurations
  - Check for any remaining TypeScript import errors
  - _Requirements: 4.2, 4.3_

- [ ] 13. Add comprehensive regression prevention
  - Create automated test that verifies all MSW responses are JSON-serializable
  - Add CI gate that confirms search returns playlists.items format
  - Create integration test that validates full search workflow
  - Add test coverage for MSW setup failure graceful degradation
  - Add monitoring for global object embeddings in fixtures
  - Create documentation for MSW environment safety rules
  - _Requirements: 1.4, 2.4, 3.3, 4.4_