# Repository cleanup plan

Created 5 October 2026. Status: **planned; implementation has not started**.

This plan turns the [repository cleanup scan](reviews/2026-10-05-repository-cleanup-scan.md) into bounded implementation stages. It supplements the cleanup portion of SM4 in [PLAN.md](../PLAN.md); the existing product roadmap remains authoritative.

## Outcome

Remove code and tooling that the current application does not use, preserve tests for supported behavior, and make current documentation describe the working product accurately. Finish with a smaller repository and passing checks, while preserving the existing Spotify/provider boundary, mixer semantics, and editor behavior.

The scan's 18 inactive implementation modules, 150 type candidates, and 56 comment matches are investigation inputs, not deletion quotas. Recheck consumers against the working tree before each removal.

## Preparation

- [ ] Record the starting commit, branch, and existing tracked/untracked changes. The scan was made on `master` at `1d4bdc03` with substantial local correctness/provider/guidance work already present.
- [ ] Work on a cleanup branch using the `codex/` prefix. Ensure the chosen checkout contains the validated local feature changes; a worktree from HEAD alone would omit them. Stage cleanup changes deliberately, preserving pre-existing work.
- [ ] Run the existing suite, production build, and lint once to establish a fresh baseline. Record failures before cleanup separately from regressions.
- [ ] Record relevant coverage from an existing trustworthy run, or generate it once if that evidence is missing. Preserve pre-existing performance results: the current performance test writes `current-run.json` during the suite.
- [ ] Reconfirm entrypoints, setup files, and consumers. Use CodeGraph first if an index is present at implementation time; otherwise use source/import searches.

**Exit:** the starting tree and check results are recorded, and cleanup edits can be distinguished from the existing feature work.

## Stage 1 — Correct current documentation and remove obvious residue

**Risk:** low. **Depends on:** preparation. **Suggested commit:** `docs: align usage guidance and remove migration residue`.

- [ ] Change README's saved-presets claim to applying built-in presets.
- [ ] Rewrite `PLAYLIST_EXHAUSTION_FEATURE.md` around the disabled continuation default, actual stop/continue semantics, limited available tracks, current TypeScript files, and `mixPlaylistsWithResult` versus the array convenience export. Describe the implemented pre-generation guidance without promising absent post-generation notices.
- [ ] Correct the performance README and source comments: Vitest, actual suite/CI inclusion, current workload size, and the fact that count targets are ignored in all-song mode. Stage 5 will settle the benchmark's final options.
- [ ] Remove the unused PrivacyPolicy, TermsOfService, and CSS imports from `AppShell.tsx`, together with their false comments and lint suppressions. Preserve those imports where used in `App.tsx`.
- [ ] Delete the unreferenced `AddUnselectedModal.module.css` and `SpotifySearchModal.module.css` files after checking source/style imports again.
- [ ] Remove the unused `src/__tests__/setupIntegrationTests.ts`. Preserve the configured `src/setupTests.ts` and its Testing Library fake-timer bridge.
- [ ] Remove edit-history comments from surviving source/tests and correct setup's verbose-logging explanation. Leave comments explaining current behavior or required compatibility.
- [ ] Remove unused default React imports where neither runtime nor namespace/type references require them. Remove the empty StoreProvider effect and describe any remaining wrapper accurately.

**Exit checks:** inspect changed documentation against source; check changed-file formatting and diff whitespace. For the code removals, run build/lint and the existing App/AppShell/provider and setup-related tests. No new tests are needed for comment/import-only changes.

## Stage 2 — Remove inactive implementation families and their isolated tests

**Risk:** medium, mainly test coverage. **Depends on:** Stage 1. Use separate commits for each family below.

| Batch | Removal candidates | Test handling |
| --- | --- | --- |
| 2A: old list wrappers | `components/TrackList.tsx`, `DraggableTrackList.tsx`, `DragErrorBoundary.tsx` | Remove isolated tests for the retired wrappers. Preserve current sortable wrapper, preview, and error-boundary coverage. |
| 2B: inactive virtualized list | `components/ui/TrackList.tsx`, its stylesheet, `hooks/useVirtualization.ts` | Inspect `ComponentInteractions.test.tsx` and `PlaylistMixerWorkflow.test.tsx` first. Move meaningful supported-flow assertions to the actual preview/source-modal components; remove assertions tied solely to the retired list. |
| 2C: old error hooks/HOC | `components/ui/withErrorBoundary.tsx`, `hooks/useApiErrorHandler.ts`, `hooks/useErrorHandler.ts` | Remove their isolated tests. Retain the active ErrorHandler, ErrorBoundary, ApiErrorDisplay, ApiErrorHandler, and their tests. |
| 2D: old drag/accessibility utilities | `hooks/useAutoScroll.ts`, `useCustomTouchEvents.ts`, `useDropPosition.ts`, `useKeyboardNavigation.ts`, `utils/accessibility.ts`, `dropPositionCalculator.ts` | Confirm none serve current UI behavior. Preserve meaningful keyboard/focus/touch assertions on the current dnd-kit and modal paths. Remove utility-only tests after that review. |
| 2E: old playlist/track hooks | `hooks/usePlaylistSelection.ts`, `usePlaylistTracks.ts`, `useTrackOperations.ts`, `useUserPlaylists.ts` | Preserve cancellation/loading assertions on active gateway/preview/generation paths before removing isolated hook tests. The same-named selection selector in `store/index.ts` remains active. |

- [ ] For each batch, list remaining imports, re-exports, mocks, fixtures, and integration-test consumers before deletion.
- [ ] Remove newly orphaned mocks/fixtures only after confirming all remaining test consumers.
- [ ] Keep a short record of retained, moved, and retired behavior assertions. Add a regression only where meaningful active behavior would otherwise lose coverage.

**Exit checks:** targeted surviving behavior tests during each batch; full suite, build, and lint after the family removals. Searches must find no dangling source imports or test mock registrations for deleted modules. Lower test counts are expected; supported behavior coverage must survive.

## Stage 3 — Remove unused state and calculations from active modules

**Risk:** medium. **Depends on:** Stage 2. Keep store, mixer, and service changes in separate commits.

- [ ] Remove unused `useTracks`, `usePlaylistOperations`, and `useMixingState` selectors. Remove `trackSlice` from store composition and AppStore if its actions/state still have no production consumers. Retire its simulated old-list integration tests; preserve the actual editor's occurrence-order tests.
- [ ] Remove `targetCounts`, the unused `estimatedTotalSongs` stopping argument, and obsolete estimate work from the production mixing context. Resolve `calculateTargetCounts` exports and callers, including the performance probe. Retain the current advisory calculation in `exhaustionPrediction.ts`.
- [ ] Remove unused `handleApiError`, `getRandomTrack`, and `getRandomTracks` exports when consumer checks still confirm the scan. Retain active error handling and playlist shuffling.
- [ ] Evaluate the unused SpotifyService methods: `setAccessToken`, `getAccessToken`, `getUserProfile`, `getUserPlaylists`, `removeTracksFromPlaylist`, `getPlaylist`, and `searchPlaylists`. Narrow service interfaces and mocks consistently with actual removals.
- [ ] If `getUserPlaylists` removal orphans the generic `paginate` helper, retire it and its isolated tests. Keep active `getNextPlaylistOffset`, batching, request-body construction, and retry handling.

**Exit checks:** full suite, build, and lint; mixer cases cover both ratio types, count/time/all modes, both exhaustion policies, shuffle/order, and repeated occurrence editing. Service/gateway cases retain pagination, unavailable items, cancellation, session changes, ordered repeated-URI writes, and partial-save reporting. The gateway's active `getPlaylist` method must remain.

## Stage 4 — Prune unused types and dependencies

**Risk:** low to medium. **Depends on:** Stages 2–3, which reduce the consumer set. **Suggested commit:** `refactor: prune unused contracts and dependency scaffolding`.

- [ ] Remove unimported `types/testing.ts`; preserve useful historical planning information as documentation only if needed.
- [ ] Work through `types/utils.ts`, `types/hooks.ts`, `types/components.ts`, `types/api.ts`, then remaining mixer/Spotify types. Resolve aliases/re-exports and internal type dependencies rather than relying on identifier counts alone.
- [ ] Remove unimplemented generic cache, queue, layout, context, and hook contracts with no remaining consumers.
- [ ] Remove duplicate central hook contracts where an authoritative local type is already used; consolidate retained contracts only where that reduces real duplication.
- [ ] Update `types/index.ts` alongside removals. Preserve canonical domain models, editor DTOs, and intentional gateway contracts.
- [ ] Remove direct `immer` usage from the dependency manifest if imports remain absent; refresh the lockfile without unrelated package upgrades.

**Exit checks:** build, lint, and full suite pass; changed source passes formatting. Run the stricter unused-local/parameter check again and account for remaining findings. Avoid enabling blanket compiler flags that force unrelated test-signature changes in this cleanup.

## Stage 5 — Repair performance and static-analysis tooling

**Risk:** medium for verification reliability. **Depends on:** Stages 3–4. **Suggested commit:** `chore: align performance baselines and analysis reports`.

- [ ] Simplify the performance test after removing the obsolete estimate probe/fallback. Choose an explicit representative workload: all-song mode governed by source exhaustion, or count mode if `PERF_TOTAL_SONGS` is intended to control the target. Record mode, source sizes, ratios, exhaustion policy, runtime version, and runner context with results.
- [ ] Make the benchmark name and README match that workload. Preserve a meaningful nonempty-output/runtime check.
- [ ] Make the comparator reject incompatible workloads or missing required metrics with a clear result. Keep correctness expectations separate from timing regressions.
- [ ] Make baseline approval update both the timestamped record and `last-baseline.json`, which the comparator actually reads. Prevent silent reuse of a stale committed current run by recording/verifying the selected run's provenance.
- [ ] Refresh the baseline on consistent hardware after workload changes. Preserve the August 2025 baseline as historical evidence; do not tune the regression threshold merely to obtain a passing result.
- [ ] Replace the invalid ts-prune JSON invocation with an honestly named text artifact or supported serialization. Remove unused `MSW_HERMETIC` configuration.
- [ ] Reconcile intended `master` coverage for performance/static-analysis push triggers; align baseline workflow's Node version with the project. Review the existing baseline PR workflow as a whole before altering its branch/commit flow.
- [ ] Recheck `babel.config.js` against build, test, and JavaScript lint consumers. Remove it only if unused; preserve Babel packages still required by ESLint.
- [ ] Keep unused-code reporting reviewable. Report production reachability separately from test usage; a clean ts-prune output alone is not evidence that the repository is free of dead modules.

**Exit checks:** run the benchmark and comparator with compatible inputs. If comparator behavior changes, verify a real regression and an incompatible-input case. Validate workflow commands locally where possible and review workflow/artifact paths; do not claim a GitHub run without observing one.

## Stage 6 — Reconcile historical documents and generated artifacts

**Risk:** low, with evidence-retention considerations. **Depends on:** the final code/tooling shape. **Suggested commit:** `docs: distinguish current guidance from historical records`.

- [ ] Refresh current-command guidance in `MODERNIZATION_PLAN.md`, remove obsolete template references from current guidance, and point readers to PLAN and this cleanup record. Keep milestone history clearly dated.
- [ ] Mark superseded `.kiro` specs as historical, particularly the earlier drag-system “current implementation” analysis. Distinguish old completed/planned work from the present implementation.
- [ ] Update `local-library-direction.md` to identify the implemented canonical subset and remaining future work. Its illustrative future metadata must not imply current popularity-based behavior.
- [ ] Preserve the verbatim archived plan. Repair discoverability of its broken relative links through an adjacent archive index/navigation note rather than rewriting promised historical text.
- [ ] Remove or archive obsolete `llm_prompt.txt`.
- [ ] Review tracked Jest output, `test-output.txt`, `test-metrics.json`, and `coverage-history.json` for durable evidence value. Remove disposable generated snapshots and add narrow ignore rules for future output. Preserve current live-verification screenshots and meaningful baseline records.
- [ ] Update PLAN's SM4 cleanup status with completed/deferred items and links to evidence. Do not replace the active product roadmap or claim the deferred UI/store DTO migration is complete.

**Exit checks:** local Markdown links resolve or archived exceptions are explained; current commands/files/features match source. Ignore rules do not hide retained baseline or verification evidence. Review the final tracked-file diff for unintended removals.

## Completion checks

- [ ] Run `npm run test:coverage` for the final full suite and coverage, `npm run build`, `npm run lint`, and the existing coverage-threshold script. Use this coverage run as the final full-suite run rather than immediately repeating `npm test`.
- [ ] Compare coverage of retained service/mixer modules and important behaviors against baseline. Explain denominator changes from removed inactive code; do not lower thresholds to mask gaps.
- [ ] Run changed-file formatting and `git diff --check`. Record untouched whole-tree formatting debt separately.
- [ ] Repeat production reachability and unused-export checks. Give each remaining candidate a concrete consumer or a documented reason for retention.
- [ ] Smoke-test the local production app: connect/refresh, supported source loading, built-in presets, both ratio types, count/time/all modes, both exhaustion policies, preview, manual additions, duplicate removal/reordering, and error display. Do not change algorithms or add provider/local-library features during cleanup. Initiate an external test save only when included in the execution authorization.
- [ ] Record fresh results, retained/deferred candidates, and any limitations. Leave existing uncommitted feature work intact.

The cleanup is complete when all implemented stages meet their exit checks, remaining exceptions are explicit, and current documentation no longer promises unsupported behavior. Publishing, merging, provider expansion, a UI redesign, broad CSS reformatting, and dependency upgrades remain separately scoped work.
