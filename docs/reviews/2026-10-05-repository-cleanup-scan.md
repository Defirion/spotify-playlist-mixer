# Repository cleanup scan — 5 October 2026

Audited the current working tree on `master`, HEAD `1d4bdc03`, including the existing uncommitted changes. This is a static cleanup audit, not authorization to remove features. No application code, existing documentation, dependencies, or tests were changed by this scan.

## Scope and checks

- Inventoried 250 TypeScript/TSX files, 24 stylesheets, 45 Markdown documents (including `.kiro`), build/test configuration, scripts, and GitHub workflows.
- Traced imports, re-exports, dynamic imports, literal `require` calls, and test mock registrations. Production reachability starts at `src/index.tsx`; tests and test utilities were classified separately.
- Ran the installed `ts-prune`, then cross-checked candidates against consumers. Its output alone is insufficient: tests make inactive default exports appear used, and barrel exports produce misleading file/line attribution.
- Normal TypeScript checking passes. ESLint reports zero errors and zero warnings across 250 files.
- A separate TypeScript check with `noUnusedLocals` and `noUnusedParameters` reports unused production imports, an unused mixer argument, and test/helper leftovers.
- Full tests, coverage, a production build, and live Spotify flows were not rerun. No behavior was changed. Generated build/coverage trees and dependency source were excluded from the repository cleanup inventory; selected installed-tool source was inspected to verify configuration behavior.

There is no `.codegraph/` at the repository root, so CodeGraph was skipped as instructed.

## Findings to address first

### 1. Current feature documentation describes the wrong exhaustion default

[PLAYLIST_EXHAUSTION_FEATURE.md](../../PLAYLIST_EXHAUSTION_FEATURE.md) says continuation is enabled by default and that the final mix will reach its target. The actual default is `continueWhenPlaylistEmpty: false` in [mixingSlice.ts](../../src/store/slices/mixingSlice.ts#L4). Continuation also cannot guarantee a target when the available tracks are insufficient.

The document still names `playlistMixer.js`, `PlaylistMixer.js`, and `App.js`, and says `mixPlaylists()` returns exhaustion metadata. The current array convenience function returns tracks; `mixPlaylistsWithResult()` returns `{ tracks, exhaustedPlaylists, stoppedEarly }`. The claimed blue/yellow post-generation preview notices are not implemented in the current `MixPreview` component, which does not receive the exhaustion fields. Pre-generation guidance is implemented separately.

**Action:** rewrite the main behavior/implementation sections against the current form, defaults, typed result, and guidance. The recent “Future Enhancements” update did not refresh the older sections above it.

### 2. The README advertises saving user presets

[README.md:8](../../README.md#L8) says users can “save your settings as presets.” [PresetTemplates.tsx](../../src/components/PresetTemplates.tsx#L19) contains three built-in presets and an apply action. No user-preset save/persistence implementation was found; the active plan also records that absence.

**Action:** describe applying built-in presets. Implementing user-saved presets would be separate feature work.

### 3. Tests conceal a substantial inactive implementation surface

Of 97 non-test/non-fixture TypeScript module candidates, 19 have no import path from the application entrypoint: **18 implementation modules and one coverage-planning module**. The following implementation modules are imported only by tests or by other inactive modules:

| Group | Files | Evidence / active replacement |
| --- | --- | --- |
| Older track-list wrappers | `src/components/TrackList.tsx`, `src/components/DraggableTrackList.tsx`, `src/components/DragErrorBoundary.tsx` | The first module's only importer is its test. The other two are used by that inactive module and their tests. Current preview rendering builds its sortable list inside `components/features/mixer/MixPreview.tsx`. |
| Older virtualized list | `src/components/ui/TrackList.tsx`, `src/hooks/useVirtualization.ts` | Consumers are list/hook tests and two integration tests. Current preview and source modal render their lists directly. |
| Unused error abstractions | `src/components/ui/withErrorBoundary.tsx`, `src/hooks/useApiErrorHandler.ts`, `src/hooks/useErrorHandler.ts` | Only their tests import them. Production still uses `ui/ErrorBoundary`, `ErrorHandler`, and the service `ApiErrorHandler`; those are active. |
| Earlier drag/scroll/accessibility utilities | `src/hooks/useAutoScroll.ts`, `src/hooks/useCustomTouchEvents.ts`, `src/hooks/useDropPosition.ts`, `src/hooks/useKeyboardNavigation.ts`, `src/utils/accessibility.ts`, `src/utils/dropPositionCalculator.ts` | Only tests and the inactive drop-position hook consume these. Production drag operations use `DndProvider`, `useDragSensors`, sortable wrappers, and occurrence identifiers. |
| Earlier playlist/track hooks | `src/hooks/usePlaylistSelection.ts`, `src/hooks/usePlaylistTracks.ts`, `src/hooks/useTrackOperations.ts`, `src/hooks/useUserPlaylists.ts` | Only tests import them. App playlist selection uses the selector in `store/index.ts`, not the same-named standalone hook. Current preview/generation loading uses `SpotifyGateway`. |

These are high-confidence removal candidates for the current application, but deleting them requires reviewing their associated tests. In particular, preserve useful end-to-end behavior assertions from the integration tests that currently render the inactive UI list. Do not delete active accessibility behavior simply because a separately tested accessibility utility module is inactive.

The 19th module, [types/testing.ts](../../src/types/testing.ts), has **no importers at all**. Its coverage seed data still names nonexistent `src/utils/playlistMixer.ts` and declares old coverage work pending. Move useful planning content into a historical document or remove the module.

### 4. The track store is wired in but has no application consumers

[trackSlice.ts](../../src/store/slices/trackSlice.ts) is composed into the store, so file-level reachability marks it active. However, `useTracks`, `usePlaylistOperations`, and `useMixingState` in [store/index.ts](../../src/store/index.ts#L109) are consumed only by tests. No production consumer of the track slice's state/actions was found. The actual preview tracks live in `useMixPreview`, and its editor callbacks manage order.

**Action:** remove unused selectors and evaluate removing the track slice. Avoid migrating the working preview into this slice solely to justify keeping it. `trackStoreIntegration.test.ts` simulates the old `DraggableTrackList` connection rather than exercising the current editor.

### 5. Obsolete mixer estimates still run on the production path

[playlistMixer.ts:64](../../src/utils/mixer/playlistMixer.ts#L64) computes `estimatedTotalSongs` and `targetCounts` in every mixing context. `targetCounts` is never read by the production mixer. `estimatedTotalSongs` is passed into [shouldContinueMixing](../../src/utils/mixer/mixingCalculations.ts#L95), whose parameter is unused: stopping now uses the selected count/time/all-song mode and source availability.

The estimate calculation, including its time-based full-track aggregation, therefore does not determine the generated mix. Tests and the performance probe still exercise the exported calculation, which makes the residue less obvious.

**Action:** remove obsolete context fields and work from the production path, then decide whether the estimate export has any intentional diagnostic contract worth retaining. Update callers/tests together. The new advisory guidance uses `utils/exhaustionPrediction.ts` and is a separate calculation to retain.

## Smaller code and asset cleanup

| Finding | Evidence | Suggested action |
| --- | --- | --- |
| Three unused imports with misleading lint suppressions | [AppShell.tsx:11](../../src/AppShell.tsx#L11) imports `PrivacyPolicy`, `TermsOfService`, and `App.module.css`, claiming they serve routes/footer links. Those are rendered by `App.tsx`; the imports in AppShell are unused. | Remove the imports, suppressions, and false comments. Keep the actual imports in App. |
| Unused default React imports | The stricter compiler check flags `App.tsx` and numerous test files using the automatic JSX runtime. | Remove only imports with no React namespace/type use. Many other default imports still support `React.FC` etc. |
| No-op provider effect | [StoreProvider.tsx:8](../../src/store/StoreProvider.tsx#L8) claims initialization/persistence but only returns children and runs an empty effect with empty cleanup. | Remove the empty effect and clarify the wrapper's purpose, or remove the wrapper if it has no intended role. |
| Empty scroll-capture operation | [useTrackOperations.ts:22](../../src/hooks/useTrackOperations.ts#L22) logs scroll measurements but its `try` body is empty. Its comment still promises centralized scroll handling. | Remove with the inactive hook; if retained, remove the no-op operation and inaccurate description. |
| Two wholly unreferenced stylesheets | `src/components/AddUnselectedModal.module.css`, `src/components/SpotifySearchModal.module.css` have no references from source or stylesheets. Both modal wrappers delegate to TrackSourceModal. | Delete the orphan stylesheets. `ui/TrackList.module.css` belongs to the inactive list and becomes removable with it. Individual selectors in active stylesheets were not exhaustively validated. |
| Unused convenience export | [apiErrorHandler.ts:521](../../src/services/apiErrorHandler.ts#L521), `handleApiError`, has no identifier references anywhere else in source/tests. | Remove the unused export/function. Do not remove the active class or its retry implementation. |
| Unused service methods within an active class | `SpotifyService.setAccessToken`, `getAccessToken`, `getUserProfile`, `removeTracksFromPlaylist`, `getPlaylist`, and `searchPlaylists` have no active application callers. `getUserPlaylists` is called only by the inactive `useUserPlaylists` hook. | Evaluate removing these methods and narrowing `ISpotifyService`/mocks together. The gateway's same-named `getPlaylist` is active and calls `getPlaylistTracks`; retain it. Removing the service's `getUserPlaylists` would also orphan the generic `paginate` helper, but retain active `getNextPlaylistOffset`. |
| Random-selection helpers unused in production | `getRandomTrack` / `getRandomTracks` in [trackShuffler.ts](../../src/utils/mixer/trackShuffler.ts#L36) are exercised by tests but have no production callers. Actual mixing uses playlist shuffling. | Remove if no intentional external contract is required. Keep `shuffleArray` and `shufflePlaylistTracks`. |
| Unused direct dependency | `immer` appears as a direct dependency, but no repository source/configuration imports it or Zustand's Immer middleware. | Remove the direct dependency and refresh the lockfile in a cleanup change. All other production dependencies have observed source imports. |

An identifier scan found **150 exported type declarations** whose names occur only at their declarations across all 250 TypeScript files. This is a conservative candidate count, not a complete semantic deletion list: internally referenced orphan types create additional candidates, and barrel re-exports need updating.

The largest groups are `types/utils.ts` (generic CSS/theme/collection/type-programming helpers), `types/hooks.ts` (unimplemented or obsolete hook contracts), `types/components.ts` (unused layout/control/context contracts), and `types/api.ts` (unused cache/queue/HTTP interfaces). Examples include `IHttpClient`, `ICache`, `IRequestQueue`, `UseDebounceReturn`, `UseAppStateReturn`, `MainLayoutProps`, `SidebarProps`, and `Graph`. Several separately declared hook return types also disagree with the hooks' local types. Prune by actual consumers rather than treating the central barrel as proof of use.

## Old comments and inactive setup

A targeted comment scan found **56 migration-residue comments in 31 files**, such as “will be replaced,” “import removed,” and “...existing code...”. This excludes ordinary useful explanations of supported compatibility behavior.

- [store/index.ts:16](../../src/store/index.ts#L16) and line 144 still say dnd-kit will replace the drag slice/hooks. dnd-kit is already integrated.
- `types/index.ts`, `types/hooks.ts`, `types/mixer.ts`, and `types/components.ts` repeat removed-drag-type notices. `types/components.ts:469` even says a Zustand drag slice is used; that slice no longer exists.
- `AddUnselectedModal.tsx:48`, `SpotifySearchModal.tsx:68`, `TrackSourceModal.tsx:41`, and multiple `TrackItem.tsx` sections retain removed-prop/handler notices instead of describing the current sortable wrapper.
- Numerous tests begin with “React import removed” comments or contain notes about deleted mocks. These are edit-history debris unless they explain a present constraint.
- [src/__tests__/setupIntegrationTests.ts](../../src/__tests__/setupIntegrationTests.ts) is neither imported nor configured as setup. Vite uses `src/setupTests.ts`; the old file duplicates registrations, mentions nonexistent `setupMSW()`, and includes a placeholder no-op test. Remove the unused file rather than repairing it.
- `src/setupTests.ts:18` says verbose logging is enabled, then defaults it to false. Rewrite that comment. Its `globalThis.jest = vi` bridge still serves Testing Library fake-timer detection and should remain.

## Outdated tooling and documentation

### Performance instructions and baselines

[src/__tests__/performance/README.md](../../src/__tests__/performance/README.md) calls the test a Jest test and says it skips CI by default. The current file registers a normal Vitest `test`; Vite includes all `src/**/*.test.{ts,tsx}`, the main CI runs coverage, and the separate perf workflow explicitly invokes it. The source comment claiming default skipping is also false.

The README suggests `PERF_TOTAL_SONGS` changes the mixing target. The test uses `useAllSongs: true`, so count targets are ignored in its normal path. The source still contains a probe/fallback inherited from the old all-song estimate behavior and a test name saying “1000 tracks” despite creating 2000 by default.

The comparator reads `baselines/last-baseline.json`, still dated August 2025. The baseline-approval workflow only creates a new timestamped file; it does not update the file the comparator reads. The older baseline also measures prior mixer semantics. Fresh comparisons require matched workload/options and an explicit current-baseline update, not just a new artifact filename.

### Static-analysis workflow residue

[static-analysis-reporting.yml:37](../../.github/workflows/static-analysis-reporting.yml#L37) writes `npx ts-prune --json` to `ts-prune.json`. Installed ts-prune 0.10.3 has no JSON option and allows unknown options, so this produces plain text under a JSON filename. Use a text artifact or an explicit serializer. Its `MSW_HERMETIC` setting is unused; MSW has been removed. The perf and static-analysis push triggers also omit `master`, the current production branch; confirm intended branch coverage before changing them.

### Historical documents versus current instructions

- `docs/BABEL_MIGRATION.md`, `docs/MODERNIZATION_PLAN.md`, the September review, and `docs/archive/PLAN-before-adoption-2026-10-05.md` clearly preserve history. Removed filenames and dated test counts in those records are not current-code defects.
- Nevertheless, `MODERNIZATION_PLAN.md:43` incorrectly labels the current `npm test` command as watch mode, and its “canonical mock template” points to files removed during consolidation. Refresh its current-toolchain guidance or move the whole document under `docs/archive` with a short pointer to the active plan.
- The archived plan has two broken relative links at line 9: `docs/reviews/...` and `docs/local-library-direction.md` now resolve beneath `docs/archive`. Because the active plan promises a verbatim archive, preserve that text and add a wrapper/navigation note if needed. No other broken Markdown links were found by the local-file link check.
- `.kiro/specs` still describe removed `dragSlice`, `useDraggable`, DragContext, MSW, and earlier test infrastructure. For example, `mobile-touch-drag-simplification/current-implementation-analysis.md` presents the earlier drag system as current. Mark superseded specs as historical and point to the active plan; incomplete historical checkboxes are not proof of missing current functionality.
- `docs/local-library-direction.md` is explicitly prospective, but its illustrative Track model still includes `popularity` and calls the canonical model “eventual.” Clarify the implemented `types/domain.ts` subset and distinguish remaining future matching/provider work.
- `llm_prompt.txt` instructs a repair of `useDrag`, `startDrag`, and `endDrag` that no longer exist. Remove or archive that old prompt.
- Tracked `test-results/jest-*.json`, `test-results/jest-*.txt`, `test-output.txt`, `test-metrics.json`, and `coverage-history.json` are old generated snapshots with no observed active script/workflow consumers. Archive useful evidence deliberately and ignore future disposable output. Preserve the new live-verification screenshots unless their evidence-retention purpose is separately resolved.
- `babel.config.js` is residue for the build/test pipeline. Treat removal as a configuration candidate: ESLint's `react-app` configuration still uses Babel tooling for JavaScript parsing, so do not indiscriminately delete transitive Babel packages.

## Cleanup order

1. Correct the README and exhaustion/performance instructions; remove false comments, unused AppShell imports, orphan stylesheets, and inactive integration setup.
2. Remove inactive implementation families and their isolated tests; migrate meaningful integration assertions onto the current UI path.
3. Remove unused track-store state/selectors, dead mixer estimates, unused runtime exports, type scaffolding, and the direct Immer dependency.
4. Reconcile baseline selection, static-analysis artifacts, historical-spec labeling, and generated-file retention.

For code removal, run the existing relevant behavior tests plus the full suite, production build, lint, and coverage threshold. Inspect changed coverage scope: deleting heavily tested inactive modules can change percentages without reducing coverage of the active product. Keep the canonical gateway/presentation bridge, legacy read fallbacks still used by current callers, active retry/pagination helpers, and the Testing Library timer bridge unless their consumers are explicitly replaced.
