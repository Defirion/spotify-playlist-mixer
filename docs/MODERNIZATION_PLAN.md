# Modernization Plan — branch `modernization`

> Handoff document. Written 2026-06-12 for a fresh session with no prior
> context; updated 2026-06-13 after Phases A and B landed. Everything you
> need to know is in this file; verify claims against the code before acting
> on them, but they were accurate when written.
>
> **Status: Phases A (`93114be9`), B (`377abe09`), and C are COMMITTED.
> Resume at Phase D.** The only uncommitted change in the tree is the
> deletion of `big_idea.txt`, which predates this work — keep it out of
> commits.

## Project snapshot

- **App**: Spotify Playlist Mixer — React 18.3 + TypeScript 4.9 SPA, built
  with **Vite 8 / Vitest** (migrated from CRA in Phase B), zustand store,
  dnd-kit drag & drop. Deployed to Netlify
  (https://spotify-mixer.netlify.app/) from `master`.
- **State**: 178 test files / 1276 tests pass (`npx vitest run`, ~50 s);
  `npm run build` (= `tsc --noEmit && vite build`) and `npm run lint` are
  clean; `npm audit` reports 0 vulnerabilities. Auth is Spotify
  Authorization Code + PKCE (`src/services/spotifyAuth.ts`); don't disturb
  it.
- **Commands**: `npm test` (vitest watch) / `npx vitest run` (one-shot),
  `npm start` (dev server on http://127.0.0.1:3000/ — host/port are pinned
  in vite.config.ts to match the Spotify app's registered redirect URI),
  `npm run build`, `npm run lint`, `npm run test:coverage`. Node pinned
  22.18.0 via Volta.
- **Branches**: `master` = production; this branch (`modernization`) was cut
  from it. Commit per phase; do NOT push to `master` (Netlify auto-deploys).
- **Windows machine**: PowerShell default; in Git Bash, `npx` args containing
  `|` get mangled by cmd.exe — pass test files as positional args.

## Goal

Four phases, in this order (3 before 1 on purpose — deleting dead code first
shrinks the migration surface):

| Phase | What | Why |
|---|---|---|
| A | Delete dead code | less to migrate |
| B | CRA → Vite + Vitest | toolchain is deprecated; 28 unfixable audit vulns |
| C | Consolidate the test suite | brittle, duplicated, implementation-coupled |
| D | Finish the store migration | AppShell threads ~17 props that components could read from the store |

Run the full test suite + production build after each phase. Each phase ends
with a commit (end commit messages with
`Co-Authored-By: Claude <noreply@anthropic.com>` if you are Claude).

---

## Phase A — delete dead code ✅ DONE (`93114be9`)

Confirmed dead (only imported by their own tests):

1. `src/services/spotifyClient.ts` + `src/services/spotifyClient.test.ts` +
   `src/services/__tests__/spotifyClient.test.ts` (yes, two test files).
2. `src/store/migration.ts` + `src/store/__tests__/migration.legacy.test.ts`,
   `migration.integration.test.ts`, `migration.helpers.test.ts`. Check
   `src/store/index.ts` first: it imports `toDisplayError` from
   `../utils/migrateError` (a DIFFERENT file — keep that one). Also remove the
   `useLegacyAppState` reference from `src/store/README.md`.
3. Audio-features methods in `src/services/spotify.ts`
   (`getTrackAudioFeatures`, `getMultipleTrackAudioFeatures`) — the Spotify
   endpoint was deprecated Nov 2024 and nothing in the app calls them. Remove
   the methods, their entries in `ISpotifyService` (src/types), their tests
   (search `audio-features` and `AudioFeatures` in `src/services/__tests__/`
   batch files and `src/test-utils/mocks/mockSpotifyService.ts`).
4. `RatioConfigContainer` and `PlaylistMixerContainer` in `src/App.tsx` —
   marked "retained for storybook"; there is no storybook. Check for test
   imports before deleting (`App.containers.test.tsx` exercises them — delete
   that test file too if it only covers these).
5. Re-run `npx ts-prune` (it's a devDependency) afterward to catch newly
   orphaned exports; use judgment, don't chase every hit.

**Done when**: suite passes, `npm run build` passes, no references remain
(grep for each deleted symbol).

---

## Phase B — migrate CRA → Vite + Vitest ✅ DONE (`377abe09`)

Completed as planned. Lessons that matter for later phases:

- **Vitest gotchas** (relevant when touching tests in Phase C):
  `vi.mock` factories are hoisted, so closures need `vi.hoisted`;
  `vi.importActual` is async-only — prefer `vi.unmock` + static import;
  tinyspy mocks aren't constructable with arrow impls (use
  `function (this: unknown) {...}`); the `globalThis.jest = vi` shim in
  `src/setupTests.ts` is REQUIRED for RTL fake-timer detection — never
  remove it.
- **Canonical mock template** for Phase C consolidation:
  `src/__tests__/hooks/useMixGeneration.{unit,extra}.test.tsx` and
  `useMixPreview.{unit,extra}.test.tsx` (vi.unmock + static import +
  vi.hoisted for factory closures).
- `define: { 'process.env': {} }` in vite.config.ts is required (shipped
  code reads `process.env.TEST_VERBOSE` / `DEBUG_*` at runtime).
- The global `vi.mock('./hooks/useMix*')` calls live in setupTests.ts;
  Phase C may convert them to per-file mocks (original plan suggestion).

Original plan kept below for reference:

### Build (Vite)

1. `npm install -D vite @vitejs/plugin-react vitest jsdom @vitest/coverage-v8`
2. Move `public/index.html` → root `index.html`; remove `%PUBLIC_URL%`
   placeholders; add `<script type="module" src="/src/index.tsx"></script>`.
3. `vite.config.ts`: `plugins: [react()]`, `build.outDir: 'build'` (keeps
   Netlify config working), and `envPrefix: 'REACT_APP_'` so the existing
   `REACT_APP_SPOTIFY_CLIENT_ID` env var keeps working **without touching the
   Netlify dashboard**.
4. **Env access**: code reads `process.env.REACT_APP_SPOTIFY_CLIENT_ID` in
   `src/components/SpotifyAuth.tsx` and `src/App.tsx`, and
   `process.env.NODE_ENV` in ~15 files. Create `src/config.ts` exporting
   `SPOTIFY_CLIENT_ID` and `IS_DEV`, reading `import.meta.env`. Replace all
   `process.env.REACT_APP_*` reads with it. For `NODE_ENV` checks prefer
   `import.meta.env.DEV`. Tests that set `process.env.REACT_APP_*` must switch
   to `vi.stubEnv` or mock `src/config.ts` (mocking the config module is more
   robust).
5. CSS modules and global CSS work in Vite unchanged. `src/types/css-modules.d.ts`
   may be replaceable by `vite/client` types in tsconfig.
6. Scripts in `package.json`: `start` → `vite`, `build` → `vite build`
   (optionally `tsc --noEmit && vite build` for type safety CRA used to give).
7. Remove `react-scripts` from dependencies. **ESLint gotcha**: the config
   extends `react-app`/`react-app/jest` (in both `.eslintrc.js` and
   `package.json#eslintConfig` — deduplicate while you're there), which is
   provided BY react-scripts. Install `eslint-config-react-app` and
   `eslint`/plugins directly, or move to a minimal flat config. Keep the
   prettier integration (husky + lint-staged depend on it).

### Tests (Vitest)

1. `vitest.config.ts` (or merge into vite.config): `environment: 'jsdom'`,
   `globals: true`, `setupFiles: ['src/setupTests.ts']`,
   `css: { modules: { classNameStrategy: 'non-scoped' } }` (tests assert
   class names like `toHaveClass('title')`; this option preserves that —
   verify against `identity-obj-proxy` behavior they currently rely on).
2. `src/setupTests.ts`: keep the jest-dom import and the console-quieting
   logic; the TextEncoder/webcrypto polyfills can likely go (vitest's jsdom
   pool runs in Node where they exist — verify the PKCE tests pass without
   them). The two global `jest.mock('./hooks/useMix*')` calls at the bottom
   must become `vi.mock` — note vi.mock paths are resolved RELATIVE TO THE
   TEST FILE in jest but vitest resolves from the importing module; safest is
   to register them via aliases or convert to per-file mocks during Phase C.
3. Codemod the suite: `jest.fn/spyOn/mock/clearAllMocks/useFakeTimers` →
   `vi.*`. With `globals: true`, `describe/it/expect` keep working. ~189
   files; do it mechanically (search/replace `jest.` → `vi.`), then fix the
   stragglers: `jest.requireActual` → `vi.importActual` (async — the
   `jest.mock(..., () => ({...jest.requireActual()}))` pattern used in the
   auth tests becomes `vi.mock(path, async importOriginal => ({ ...(await
   importOriginal()), ... }))`).
4. `src/jest.polyfills.ts` and `jest.config.js` (standalone config used by
   `coverage:jest` script): delete once vitest is in. `src/__mocks__/fileMock.ts`
   and `identity-obj-proxy` become unneeded (Vite handles assets/CSS).
5. The `scripts/` folder has ~12 custom coverage/perf scripts wired into
   `package.json` (`ci:test`, `coverage:*`, `test:metrics`, `perf:compare`).
   They parse CRA/jest output paths. Decide per script: port the ones CI uses
   (see `.github/workflows/ci.yml`, `perf.yml`) to vitest's JSON/coverage
   output, delete the rest. Don't silently break CI — update the workflows in
   the same commit.
6. `package.json#jest` section (if any) and `babel-*`/`@babel/preset-*`
   devDependencies: remove after confirming nothing else uses Babel (the
   `.eslintrc.js` parser might).

**Done when**: `npx vitest run` passes the whole suite, `npm run build`
produces a working bundle (smoke-test login redirect + playlist search
against the real app with `npm start`), `npm audit` shows the CRA-derived
vulnerabilities gone, CI workflow files reference the new commands.

**Netlify**: build command stays `npm run build`, publish dir stays `build/`
if you set `build.outDir`. Env var `REACT_APP_SPOTIFY_CLIENT_ID` keeps
working via `envPrefix`. State this in the PR description so the deploy isn't
a surprise.

---

## Phase C — consolidate the test suite ✅ DONE

Landed: 178 → 135 test files, 1276 → 1144 tests, suite runtime 54s → 38s.
Coverage held where it matters: `src/services` 95.0%, `src/utils/mixer`
98.3% statements (both ≥ 90%); overall statements 96.8%. What changed:

- App tests: nine files collapsed to `src/__tests__/App.test.tsx` (mocked
  store + AppShell, incl. the token-refresh effect) and
  `App.integration.test.tsx` (real store). Shared fixtures live in
  `src/test-utils/mockStoreReturns.ts` (`applyStoreMocks`).
- Spotify service: the `spotify.batchA–I` files (and other whole-service
  mocks that asserted on their own mocks) were deleted; the real DI-based
  suite now lives at `src/services/__tests__/spotify.service.test.ts` with
  validation + DI cases folded in.
- One file per hook (useMixGeneration/useMixPreview/useSpotifySearch/
  useTrackOperations/useTrackSelection/useKeyboardNavigation) — `unit`,
  `extra`, `simple`, and placeholder smoke files merged/dropped. Same for
  accessibility/haptics/normalizeError/errorNormalizer/fetchClient.
- De-brittled: dropped incidental `console.*` assertions (kept only where
  logging is the feature: DEBUG-gated branches, dedup logging); auth-URL
  tests already parse with `new URL`. Removed the `silenceIfPass`
  machinery + `SILENCE_POLICY.md`.
- `tsconfig.json` excludes `src/__tests__` and `src/test-utils` from
  `tsc --noEmit`, so files relocated INTO `src/<area>/__tests__` get
  type-checked — fixed the latent `any`/`MixOptions`/`.at()` errors that
  surfaced. `scripts/dir-coverage.js` prints per-dir statement coverage.

Original plan kept below for reference:

Target: fewer, behavior-focused tests. ~700 is a reasonable landing zone;
judge by redundancy, not by count. Keep coverage of `src/utils/mixer/**` and
`src/services/**` strong — that's where the real logic lives.

1. **Merge the App test files**: `src/__tests__/App.auth.fixed.test.tsx`,
   `App.behavior.test.tsx`, `App.handlers.test.tsx`, `App.component.logic.test.tsx`,
   `App.state.test.tsx`, `App.routes.test.tsx`, `App.containers.test.tsx`
   (may be gone after Phase A), `src/components/__tests__/App.unit.test.tsx`,
   `src/__tests__/app.integration.test.tsx` → two files: `App.test.tsx`
   (unit, mocked store) and `App.integration.test.tsx` (real store).
   They re-stub the same five store hooks with near-identical fixtures —
   extract a `mockStoreReturns` helper into `src/test-utils/`.
2. **Merge the service batch files**: `src/services/__tests__/spotify.batchA–H.test.ts`
   plus `spotify.service.test.ts`, `spotify.validation.test.ts`,
   `spotify.di.test.ts`, `src/__tests__/services/spotify.service.test.ts` →
   organize by method (`describe('getPlaylistTracks')` etc.), drop duplicate
   cases. Expect to delete a third of them outright.
3. **De-brittle assertions** while merging: no exact-URL string equality
   (parse with `new URL` and assert params), no asserting on `console.log`
   calls except where logging IS the feature
   (`mixingStrategies.logging.test.ts` — reconsider whether that file earns
   its keep), no asserting internal call order of mocks.
4. Duplicated hook tests: several hooks have both `src/hooks/__tests__/X.test.ts`
   and `src/__tests__/hooks/X.*.test.tsx` variants (`useMixPreview`,
   `useMixGeneration` have FOUR files between them: unit/extra/simple).
   One file per hook.
5. Delete `src/test-utils/silenceIfPass.ts` machinery if the merged suite no
   longer uses it (check `SILENCE_POLICY.md` and remove both together if so).

**Done when**: suite passes, statement coverage on `src/utils/mixer` and
`src/services` stays ≥ 90%, overall suite runtime drops, no test asserts an
exact authorize-URL string or console call outside the logging tests.

---

## Phase D — finish the store migration (kill AppShell prop drilling)

Current shape: `MainApp` (src/App.tsx) reads five store hooks and passes ~17
props into `AppShell` (src/AppShell.tsx), which fans them out to
`PlaylistSelector`, `PresetTemplates`, `RatioConfig`, `PlaylistMixer`,
`ToastError`, `SuccessToast`. The zustand store (src/store/index.ts) already
exposes selector hooks for everything.

1. Convert children one at a time to read the store directly
   (`useAuth`, `usePlaylistSelection`, `useRatioConfig`, `useMixOptions`,
   `useUI`, `setUIError`). Keep presentational components that take simple
   data props (TrackList etc.) as they are — this is about the six
   container-level components.
2. `AppShell` shrinks to layout + the `isAuthenticated` branch. The auth
   callback/refresh effects stay in `MainApp`.
3. Type what remains: no `any[]` props (`selectedPlaylists: SpotifyPlaylist[]`,
   `ratioConfig: RatioConfig` from src/types). Delete prop types that become
   unused in `src/types/components.ts`.
4. Update tests as you go: component tests that passed props now mock the
   store hooks instead (the pattern in `App.behavior.test.tsx` —
   `jest.mock('../store')` / `vi.mock` — already does this; reuse the Phase C
   helper).

**Done when**: AppShell takes ≤ 4 props, no `any` in component prop
signatures touched by this phase, suite + build pass, manual smoke test of
the full flow (connect → add playlists → preset → mix → create) works.

---

## Invariants — do not regress

- Auth stays Authorization Code + PKCE; tokens in memory only (no
  localStorage persistence). `spotifyAuth.test.ts` includes an RFC 7636
  vector test — it must keep passing.
- `.env` stays gitignored; never commit a client ID.
- The mixer's "Random Mix" strategy interleaves popularity quadrants
  round-robin (fixed 2026-06-12; concatenation made it behave like "Hits
  First"). `mixingStrategies.test.ts` pins this.
- Production build output must remain deployable on Netlify without
  dashboard changes (build cmd `npm run build`, publish `build/`,
  env `REACT_APP_SPOTIFY_CLIENT_ID`).
