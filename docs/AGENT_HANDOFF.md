# Agent Handoff — Expand Integration Test & Add MSW Hermeticity Check

Purpose
-------
This document captures the investigation, key facts, and a short, actionable plan so a fresh agent can continue expanding the end-to-end integration test ("select → configure → mix") and add a hermeticity check that fails when a real network request escapes MSW.

Checklist (what this file delivers)
----------------------------------
- [x] Repo high-level summary and test infra notes
- [x] Key files/components/hooks to inspect (paths)
- [x] MSW setup and important handlers/endpoints to mock
- [x] Concrete test expansion steps (integration test) with selectors and interactions
- [x] Hermeticity test recipe and where to add it
- [x] Assumptions, edge-cases, and quality gates
- [x] Commands to run locally (PowerShell-friendly)

Quick repo snapshot
-------------------
- React + TypeScript app (src/). Uses Zustand store slices in `src/store` for app state.
- Test infra: Jest + React Testing Library + user-event. MSW is used for network mocking.
- Test helpers live in `src/test-utils` and `src/test-utils/mocks` (safe MSW setup helpers included).
- Mixing logic split between hooks (`useMixPreview`, `useMixGeneration`) and `PlaylistMixer` component.

Key files (read first)
----------------------
- App composition and entry
  - `src/App.tsx` (Main app/controller, composes hooks and passes into `AppShell`)
  - `src/AppShell.tsx` (presentational shell created in refactor)
  - `src/AppProviders.tsx` (global providers wrapper)
  - `src/index.tsx` (app entry wiring providers)

- Components and hooks involved in the main flow
  - `src/components/PlaylistSelector.tsx` (search input, results, "Add" behavior)
  - `src/components/PlaylistMixer.tsx` (mix UI: generate preview, create playlist)
  - `src/components/features/mixer/*` (PlaylistForm, MixControls, MixPreview)
  - `src/hooks/useMixGeneration.ts` (generates mix; uses `SpotifyService`)
  - `src/hooks/useMixPreview.ts` (preview generation)
  - `src/hooks/usePlaylistSearch.ts` (drives `/search` calls)
  - `src/hooks/useSpotifyUrlHandler.ts` (resolves playlist IDs and fetches playlist by id)

- MSW & test utilities
  - `src/test-utils/mocks/mswSetup.ts` (lazy MSW setup for Jest)
  - `src/test-utils/mocks/mswHandlers.ts` and `src/mocks/handlers.ts` (project fixtures)
  - `src/test-utils/msw-setup.ts` and `src/test-utils/__tests__/msw.smoke.test.ts` (alternative helpers & smoke test)
  - `src/test-utils/mockVisualViewport.ts` (visualViewport shim)

- Example integration tests to extend or reuse
  - `src/__tests__/integration/CompleteMixingWorkflow.test.tsx` (hook-mocked; good template)
  - `src/__tests__/app.integration.test.tsx` (mounts `App` with `AppProviders`, very small)
  - `src/__tests__/integration/PlaylistSizeVariants.test.tsx` and other integration tests

MSW: important handlers & endpoints
----------------------------------
MSW handlers live in `src/mocks/handlers.ts` (preferred) and `src/test-utils/mocks/mswHandlers.ts` (safe require fallback). Key endpoints already mocked:
- GET `https://api.spotify.com/v1/me` → returns user profile
- GET `https://api.spotify.com/v1/me/playlists` → returns playlists (pagination)
- GET `https://api.spotify.com/v1/playlists/:playlistId/tracks` → returns tracks
- GET `https://api.spotify.com/v1/search` → used by `usePlaylistSearch`
- POST `https://api.spotify.com/v1/users/:userId/playlists` → create playlist
- POST `https://api.spotify.com/v1/playlists/:playlistId/tracks` → add tracks
- GET `https://api.spotify.com/v1/audio-features/:trackId` → audio features

Notes about MSW setup
- `src/test-utils/mocks/mswSetup.ts` calls `setupServer(...handlers)` and `server.listen({ onUnhandledRequest: 'warn' })` by default. Some existing tests override behavior to `error` for hermetic runs.
- A global `__msw_server` is attached when `setupMSW()` is used by tests.

Where tests currently sit
- Most service-level tests already use MSW via `setupMSW()` helper in `src/test-utils/mocks/mswSetup.ts`.
- Integration tests often mock mixing hooks using `test-utils/mocks/mixHooks` to keep behavior deterministic. See `src/__tests__/integration/CompleteMixingWorkflow.test.tsx` for patterns.

Goal: Expand an integration test that mounts the real app (or `PlaylistMixer`) and exercises the full user journey with MSW-only network mocking.

Concrete plan for expanding the integration test
-----------------------------------------------
1) Pick test file to extend or create a new one:
   - Suggested new file: `src/__tests__/integration/EndToEndMixFlow.test.tsx`
   - Alternative: extend `CompleteMixingWorkflow.test.tsx` if you prefer the existing template.

2) Test setup (top of test file)
   - Import and call the safe MSW setup helper: `import { setupMSW } from '../../test-utils/mocks/mswSetup'; setupMSW();`
   - Use `mockVisualViewport()` when mounting `App` if DnD or viewport code is used (existing pattern in `src/__tests__/app.integration.test.tsx`).
   - If MSW is available, change server to fail on unmatched requests for hermeticity within this file during CI runs by calling `global.__msw_server.listen({ onUnhandledRequest: 'error' })` — see hermeticity section below.

3) Mount target component
   - Option A (preferred for full-flow): render the real `App` inside `AppProviders` to exercise store wiring and UI routing.
     - `render(<AppProviders><App /></AppProviders>);`
   - Option B: render `PlaylistMixer` directly and pass `selectedPlaylists` using `src/mocks/fixtures.mockPlaylists`.

4) Drive UI with RTL + user-event
   - Use `userEvent.setup()` for async interactions.
   - Steps:
     a. Use PlaylistSelector: simulate typing a search term that triggers `usePlaylistSearch`.
        - Query selector: input placeholder text from `PlaylistSelector` or label text "Search playlists or paste URL:". Use `screen.getByPlaceholderText` or label.
        - Wait for results: MSW's `/search` handler returns playlists derived from `mockTracks` or `mockPlaylists`. Use `await screen.findByText(/My Awesome Playlist|Chill Vibes/i)`.
        - Click a search result to add playlist. Alternatively, mock `useSpotifyUrlHandler` to call `onPlaylistSelect` directly.
     b. Repeat to select two playlists (the mixer requires at least two).
     c. Open configure modal (if UI exposes it) or rely on defaults. `PlaylistMixer` uses `mixOptions` and `ratioConfig` from store; you can update via form inputs in `PlaylistForm`.
     d. Click "Generate preview" button: role button with name /generate preview/i (examples exist in tests).
     e. Wait for preview UI to render — `MixPreview` displays track rows; assert `screen.findByText(/Test Song 1/i)` or preview track counts.
     f. Click "Create this playlist" (button text: /create this playlist/i) to trigger `useMixGeneration.createPlaylist` and POST calls.
     g. Wait for success: assert the success toast was called, or assert a callback `onMixedPlaylist` was called (when mounting `PlaylistMixer` directly). If mounting `App`, assert store `mixedPlaylists` contains created playlist or a toast is visible.

5) Assert MSW-observed network calls (optional but recommended)
   - Two approaches:
     A) Use handler closures that mutate an external `jest.fn()` to record when endpoints are called. Example: In test, do `const createPlaylistSpy = jest.fn();` and add a one-off handler via `global.__msw_server.use(rest.post(..., (req, res, ctx) => { createPlaylistSpy(req); return res(...); }))`. Then assert `expect(createPlaylistSpy).toHaveBeenCalled()`.
     B) Rely on service-level tests for endpoint correctness and assert UI changes only here.

6) Clean up
   - After test, call `global.__msw_server.resetHandlers()` when you override handlers.
   - Restore any mocked hooks or globals.

Hermeticity test recipe
-----------------------
Add a short test that fails if any real network request escapes MSW. Place it early in the test run.

Suggested file: `src/test-utils/hermeticity.test.ts`
Contents (outline):
- Use the same MSW setup helper to get a server instance.
- Start the server with `server.listen({ onUnhandledRequest: 'error' })` so any unmatched request throws during the test.
- Run a tiny fetch (e.g., `await fetch('https://example.com/should-not-be-called')`) inside a test expecting it to be intercepted; but better: just rely on server listening behavior. A simple always-passing test will surface an error if any previously executed test leaked a real request. Example pattern:

  - beforeAll: `const server = setupMSW(); if (server) server.listen({ onUnhandledRequest: 'error' });`
  - test: `expect(true).toBe(true)`
  - afterAll: `if (server) server.close();`

This ensures the Jest process will error early if some other test attempts a real network call while MSW is set to error on unhandled requests.

Alternatively (preferred for CI): Configure a global hermetic mode when running CI tests by setting an env var (e.g., `MSW_HERMETIC=1`) and modify `src/test-utils/mocks/mswSetup.ts` to call `server.listen({ onUnhandledRequest: 'error' })` when that env var is present.

Practical next edits (small commit list)
--------------------------------------
1. Create: `src/__tests__/integration/EndToEndMixFlow.test.tsx` — implement plan above, using `setupMSW()` and `App` mounting. Use `global.__msw_server.use()` to add spies for critical endpoints.
2. Create: `src/test-utils/hermeticity.test.ts` — small test that starts MSW server with `onUnhandledRequest: 'error'` (or update mswSetup to honor `MSW_HERMETIC` env var).
3. If CI runs fail due to MSW ESM issues, prefer the pattern used in repo: require MSW lazily via `require()` (see existing `mswSetup.ts`). Reuse the same approach.

Assumptions
-----------
- Jest and MSW are available in the environment; the repo already contains lazy MSW setup helpers.
- Tests run in Node/Jest environment (PowerShell commands below are for developer convenience).
- Some integration tests currently mock mixing hooks — you can either keep mocking them for determinism, or use real hooks but then ensure SpotifyService is deterministic (MSW handlers already provide deterministic fixtures).
- `global.__msw_server` is set by `setupMSW()`; use it to register per-test handler overrides.

Edge cases & gotchas
--------------------
- MSW v2 ESM transform can break Jest in some configs. The repo already uses lazy `require()` helpers to avoid importing `msw/node` at module load time. Follow that pattern when adding new tests.
- Some tests prefer `onUnhandledRequest: 'warn'` to reduce noise; set to `'error'` only in hermeticity test or a dedicated hermetic suite to avoid flakiness during local dev.
- DnD and visualViewport: tests that exercise drag behavior should call `mockVisualViewport()` and restore after the test to avoid missing global.
- Playlist search is debounced (150ms default). Use `userEvent.type` and then await `findBy*` rather than immediate queries.

Quality gates before merge
--------------------------
- Run unit tests and integration tests locally.
- Ensure new tests do not import msw/node at top-level (use lazy helpers). Keep transforms compatible with current Jest config.
- CI should run the hermetic check; if it fails, update MSW handlers to cover missing endpoints.

How to run tests (PowerShell commands)
-------------------------------------
# run all tests (slower)
npm test --silent

# run only integration tests (fast iteration)
npm test --silent -- --testPathPattern=src/__tests__/integration -i

# run a single test file
npm test --silent -- --testPathPattern=src/__tests__/integration/EndToEndMixFlow.test.tsx -i

# run lint autofix (repo convenience)
npm run lint:fix

Notes for the next agent
------------------------
- Start by opening `src/__tests__/integration/CompleteMixingWorkflow.test.tsx` and `src/mocks/handlers.ts` to reuse existing patterns.
- Prefer adding handler spies via `global.__msw_server.use()` inside each test so assertions can confirm network activity.
- Keep MSW lazy-require pattern (see `src/test-utils/mocks/mswSetup.ts`) to avoid Jest transform issues.

Contact points in code (fast reference)
---------------------------------------
- `PlaylistSelector` (search input, placeholder text): `src/components/PlaylistSelector.tsx`
- `PlaylistMixer` controls (Generate / Create): `src/components/PlaylistMixer.tsx` and `src/components/features/mixer/*`
- MSW main project handlers: `src/mocks/handlers.ts`
- Lazy MSW helper: `src/test-utils/mocks/mswSetup.ts`
- Hook mocks factory: `src/test-utils/mocks/mixHooks.ts`

Completion summary
------------------
This file summarizes the findings and provides a step-by-step plan, concrete file targets, and commands the next agent can use to expand the end-to-end integration test and add a hermeticity check. Implement the two small tests described above and iterate on MSW handlers until the hermeticity check is green in CI.


