# Remaining Testing & MSW Tasks

This file collects focused, high-value tasks to close testing gaps discovered during the coverage run and to harden MSW/API behavior.

## 1. Service-level & MSW tests (MAX 100 lines)
- Purpose: Ensure `src/services/spotify.ts` and other service logic handle success, malformed payloads, 429 rate-limits, and auth expiry.
- Steps:
  - Add unit tests for `spotify.ts` covering: normal payloads, missing fields, 429 responses, 500 errors, and token-expiry flows.
  - Extend MSW handlers to simulate 429 with Retry-After and auth-expiry responses.
  - Assert error normalization and user-facing messages via `apiErrorHandler`.
- Acceptance: Tests cover 80%+ of `src/services/spotify.ts` and MSW handlers return deterministic responses for the scenarios above.

## 2. App-level integration & hook coverage (MAX 150 lines)
- Purpose: Increase coverage for `App.tsx`, zero-covered hooks, and ensure the main app flow is exercised by tests.
- Steps:
  - Create an integration test that mounts `src/App.tsx` and runs a full mix flow (select playlists → configure → run mix) using MSW fixtures.
  - Add unit tests for zero-covered hooks (`useAutoScroll`, `useCustomTouchEvents`, `useDropPosition`, `useMixGeneration`, `useMixPreview`, `useScrollDebugger`, `useTrackOperations`) by mounting tiny components that call the hooks.
  - Ensure tests stub or mock browser APIs where needed (visualViewport, pointer events).
- Acceptance: Coverage for `App.tsx` and the listed hooks increases noticeably; no new runtime network calls occur during tests.

## 3. PlaylistMixer orchestration tests (MAX 120 lines)
- Purpose: Cover `src/utils/playlistMixer.ts` orchestration logic and edge cases.
- Steps:
  - Add deterministic fixtures for playlists (empty, single, large) and test orchestration outputs.
  - Validate behavior on invalid ratios and empty source lists.
- Acceptance: `playlistMixer.ts` reaches >90% unit coverage and edge cases are asserted.

## 4. MSW leak detection and test hermeticity (MAX 40 lines)
- Purpose: Fail tests if a real network call escapes MSW mocks.
- Steps:
  - Add a small test in `src/test-utils` that asserts no network requests were made outside MSW handlers (or use `msw/node` to track unmatched requests).
  - Make the test run early in the suite (or as part of CI pre-checks).
- Acceptance: Suite fails if any test performs an unmocked network request.

## 5. Performance smoke & large fixture tests (MAX 80 lines)
- Purpose: Verify mixing performance on large playlists (1k tracks) without full profiling in CI.
- Steps:
  - Add a fast-running perf test that measures runtime for mixing 1k tracks and asserts it completes within an agreed budget (e.g., 300ms on CI baseline).
  - Mark as a perf test to run on schedule or selectively in CI.
- Acceptance: Test exists and runs locally/CI; results are recorded in `PERF_BACKLOG.md`.

## 6. CI gating & documentation (MAX 40 lines)
- Purpose: Add gating to prevent regressions and document test patterns.
- Steps:
  - Add a CI job or step to run coverage check and fail if overall coverage drops below the baseline (e.g., 60% now, target 75+).
  - Document MSW testing patterns in `docs/MSW_TESTING.md` with examples used by the new tests.
- Acceptance: CI enforces coverage threshold and docs contain examples for MSW+Jest usage.

## Notes & Next Actions
- Prioritize Service-level/MSW tests and App-level integration tests first — these reduce the biggest uncovered areas.
- After tests are added, run `npm test -- --coverage --watchAll=false` and iterate on failing/edge cases.

---
Generated: automated task list for closing testing gaps and MSW hardening.
