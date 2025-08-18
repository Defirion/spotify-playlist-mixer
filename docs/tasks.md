# Remaining Testing & MSW Tasks

This file collects focused, high-value tasks to close testing gaps discovered during the coverage run and to harden MSW/API behavior.

## 1. Service-level & MSW tests (MAX 100 lines)
- Purpose: Ensure `src/services/spotify.ts` is correct, resilient to malformed payloads and server errors, and easy to test.
- Strategy: Make the service modular so pure helper logic (batching, pagination, request-body builders) is unit-testable; keep a thin orchestration `SpotifyService` that is covered by a small set of MSW-backed integration tests as a regression guard.
- Detailed plan (contract-first, incremental):
  - Goal: Extract small, pure helpers with explicit contracts, add fast unit tests for each, then wire them into a thin `SpotifyService` and validate behavior with a small MSW-backed regression suite.

  - Helper modules and contracts (file → responsibilities → concise contract):
    - `src/services/_helpers/batching.ts`
      - Responsibility: split arrays into batches for add/remove operations.
      - Contract: (items: T[], batchSize: number) => T[][]; throws if batchSize <= 0; returns [] for empty input.

    - `src/services/_helpers/requestBody.ts`
      - Responsibility: build request payloads for Spotify endpoints (add/remove/reorder).
      - Contract: (uris: string[], opts?: {position?: number, snapshot_id?: string}) => { body: object } ; filter invalid URIs, deterministic JSON shape.

    - `src/services/_helpers/pagination.ts`
      - Responsibility: async paginator that yields items across pages (cursor or offset style).
      - Contract: (fetchPage: (cursor?: string) => Promise<Page<T>>, options?: {initialCursor?: string}) => AsyncGenerator<T>
      - Stops when page.next_cursor is falsy; throws on malformed pages.

    - `src/services/_helpers/retry.ts`
      - Responsibility: generic retry/backoff with Retry-After support and jitter.
      - Contract: (fn: () => Promise<T>, opts?: {maxRetries?: number, baseMs?: number}) => Promise<T>
      - Behavior: honors HTTP Retry-After header when provided, uses deterministic jitter when Math.random is stubbed in tests.

    - `src/services/spotifyClient.ts` (thin adapter)
      - Responsibility: single place for axios usage, header injection, and token refresh hook injection for tests.
      - Contract: class or factory exposing typed get/post/delete methods; accepts injectables (axios instance, token provider) for unit testing.

    - `src/services/_helpers/errorNormalizer.ts` (or extend `apiErrorHandler`)
      - Responsibility: normalize axios/network errors into { code, userMessage, retryable, retryAfter? }.
      - Contract: (err: unknown) => NormalizedApiError

  - Unit-test matrix (per helper, fast):
    - `batching.ts`: empty input, exact-boundary batch (len % size === 0), remainder batch, batchSize 1, invalid batchSize throws, very large arrays performance smoke.
    - `requestBody.ts`: drop invalid URIs, include optional params, correct JSON shape, stable ordering, defensive null inputs.
    - `pagination.ts`: single page, multi-page yield order, stop on missing next, malformed page (missing items) throws.
    - `retry.ts`: respects Retry-After header, respects maxRetries, jitter deterministic if Math.random stubbed, returns last error when exhausted.
    - `spotifyClient.ts`: header injection, token provider called on 401, axios calls stubbed; test by injecting a fake axios instance.
    - `errorNormalizer.ts`: 401 → auth-expiry, 429 → retryable with retryAfter, 5xx → retryable, malformed body → generic network error message.

  - Integration / MSW regression tests (small, focused):
    - Keep 3–5 MSW-backed tests that exercise SpotifyService orchestration only:
      1. Happy path add-tracks (multiple batches) → asserts final state/snapshots and progress events.
      2. Mid-batch 429 with Retry-After → assert retry honored and orchestration resumes.
      3. 401 during operation → assert token-refresh hook is invoked (stubbed) and operation retries or surfaces correct normalized error.
      4. 500 server error → assert normalized error surfaced and retries follow backoff rules (can assert attempt counts by MSW handler state).
    - Use MSW handler overrides inside each test to deterministically trigger the scenario; keep these tests fast by stubbing delays and timeouts.

  - Extraction order (minimal risk):
    1. `batching.ts` + unit tests (fast, unblocks add/remove flows).
    2. `requestBody.ts` + unit tests.
    3. `retry.ts` + unit tests (stub Math.random for jitter tests).
    4. `spotifyClient.ts` adapter + unit tests (inject axios stub).
    5. Integrate helpers into `spotify.ts` gradually; run small MSW regression tests after each integration step.
    6. `pagination.ts` and `errorNormalizer.ts` as follow-ups if coverage gaps remain.

  - Quality gates & verification steps:
    - After each helper extraction: run its unit tests and the full test suite with coverage.
    - Keep the MSW regression tests green after each change; use handler overrides to assert exact retry/attempt counts.
    - Add a short smoke test to `src/test-utils` that fails if a network call escapes MSW (hermeticity check).
    - Add Jest snapshots for request bodies where helpful (but prefer explicit assertions for clarity).

  - Commands and quick checks:
    - Run unit tests for helpers as you extract them:
      - npm test -- src/services/_helpers/batching.test.ts
    - Run full suite with coverage after each major step:
      - npm test -- --coverage --watchAll=false

- Acceptance criteria:
  - Unit tests cover extracted helpers with high coverage (fast, deterministic).
  - `src/services/spotify.ts` overall coverage >= 80% (achieved by combining helper unit tests + small orchestration integration tests).
  - MSW handlers provide deterministic triggers for 429 / 401 / 500 and are used only in integration/regression tests.
  - No production behavior changes; all MSW-backed integration tests remain green after each refactor step.

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
