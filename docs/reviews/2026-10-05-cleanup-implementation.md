# Cleanup implementation record — 5 October 2026

The initial checkout was `master` at `1d4bdc03ffcc7119057edb0624f2565daaf81580`.
The starting status and performance result are retained in `cleanup-evidence/`.
At the user's request, all existing source, documentation, screenshots, and tracked
artifact deletions were committed first as `511e5019`. Local `.claude` settings were
excluded. Cleanup continues on `codex/repository-cleanup` from that commit.
A binary patch of the initial tracked changes was also saved outside the repository
in the system temporary directory before any cleanup edits.

## Baseline

Fresh coverage run: 1,074 tests in 138 files passed; statements 95.73% (3168/3309),
branches 87.57%, functions 95.96%, lines 96.46%. Build and lint passed.
Existing warning: production JavaScript chunk exceeds 500 kB.
Host runtime: Node 24.4.1, npm 11.4.2; the project pins Node 22.18.0.
Coverage summary is retained in `cleanup-evidence/baseline-coverage.json`.
No CodeGraph index was present. Static imports, re-exports and literal mock
registrations were rechecked; see `cleanup-evidence/starting-reachability.json`.

## Stage 1

Corrected preset/exhaustion/performance guidance, removed AppShell's unused imports,
two unreferenced modal stylesheets and inactive integration setup, removed empty
provider lifecycle work and migration comments, and dropped unused React defaults.
The Testing Library fake-timer bridge remains. Build/lint and 27 App/AppShell/setup
checks passed. Default React imports with namespace/type use were retained.

## Stages 2–4

Retired the inactive list wrappers, virtualized list, error hooks/HOC, old drag and
accessibility utilities, and standalone playlist/track hooks in separate commits.
Removed the unused track store slice/selectors, mixer estimate context and random
pick helpers, and seven unused SpotifyService methods. The gateway's `getPlaylist`
and service pagination remain active. In particular, `paginate` still serves
`getPlaylistTracks`, so the plan's conditional pagination removal did not apply.
Removed the orphan fake Spotify service after checking its remaining consumers.

Pruned 234 unused type declarations using TypeScript alias resolution and type
dependency tracing, rather than identifier counts alone; the names are retained in
[pruned-types.json](cleanup-evidence/pruned-types.json). Canonical domain contracts,
editor DTOs and actual gateway contracts remain. Removed the direct Immer dependency
without upgrading packages; Zustand's optional peer still accounts for its lockfile
entry. Normal typechecking, 789 tests in 109 files, build and lint passed at this stage.

| Assertions                                                                                                                        | Handling                                                                                                                                                               |
| --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Retired wrapper/virtualization, legacy drag, error-hook and track-slice behavior                                                  | Removed with implementations that had no application consumers                                                                                                         |
| Modal keyboard selection, exact additions, selection reset, keep-open behavior, Escape/focus restoration, ARIA and error recovery | Moved to the actual DndProvider/TrackSourceModal flow in `SourceModalWorkflow.test.tsx`                                                                                |
| Cancellation and loading ownership                                                                                                | Preserved active gateway/generation tests; moved old playlist-hook assertion to a stale-preview/newer-request-loading regression                                       |
| Generation cancellation                                                                                                           | Attached the rejection observer before aborting to prevent an unhandled rejection under full-suite load; asserted AbortError and final state after React updates flush |
| Count/time ratios, count/duration/all modes, both exhaustion policies, order/shuffle, repeated occurrence edits                   | Retained active mixer and editor regressions                                                                                                                           |
| Pagination, unavailable items, session changes, cancellation, ordered repeated URI writes and partial saves                       | Retained active service/gateway regressions                                                                                                                            |
| Fixture JSON serialization                                                                                                        | Retained useful fixture tests; retired one placeholder assertion about a previously removed MSW module                                                                 |

Targeted surviving checks passed after every family removal. Their results are
recorded in the respective commits; supported flows have final full-suite and live
verification below. The final count falls from 1,074 to 788 because retired
implementations and their isolated tests were removed.

## Stage 5

Replaced the obsolete benchmark probe with an explicit 2,000-track all-song workload:
three sources of 1,000/600/400 unique three-minute tracks, equal frequency ratios,
stop at first exhaustion, 2 warmups and 5 measured samples. Expected output is 1,200
tracks. Records contain full options, runtime/hardware/invocation context, run ID,
time, commit and a normalized source digest. Heap delta remains informational.

The comparator rejects incompatible/missing records, checks output correctness
separately, and retains the 10% timing threshold. Five tooling tests cover actual
regression, count mismatch, incompatible contexts and provenance rejection.
Approval verifies a fresh source-matching selected run and updates both dated and
active baselines. Preserved the August 2025 records; approved an explicitly local
Windows/Node 24 baseline. The final compatible run measured 94.998 ms median,
1,200 tracks, **+3.47%: passed**; see
[final-performance.json](cleanup-evidence/final-performance.json).

Performance/static-analysis workflows now include `master`, pin Node 22.18.0 and
emit honestly named ts-prune text plus separate production reachability evidence.
Removed unused MSW configuration. Baseline approval generates its own run and lets
the existing PR action manage its branch/commit. Workflow YAML parsed locally;
no GitHub execution or PR was initiated. A baseline from the consistent GitHub
Linux/Node 22 runner is still required before CI comparison can pass with that
context; the comparator intentionally rejects this local baseline there.

Removed unused Babel configuration after build/test/lint consumer inspection;
retained ESLint's required Babel packages and verified JSX parsing. Added a static
reachability report without creating a CodeGraph index.

## Stage 6

Updated current modernization and store guidance, distinguished the implemented
canonical subset from future local-library work, and marked all 26 `.kiro` specs
as historical. The archived plan remains verbatim; its two broken root-relative
documentation links are explained and repaired through the adjacent
[archive navigation](../archive/README.md).

Removed the old prompt and disposable Jest/test/coverage snapshots. Their byte
counts and SHA-256 values are in
[retired-generated-artifacts.json](cleanup-evidence/retired-generated-artifacts.json);
checkpoint `511e5019` preserves them. Narrow ignores cover only generated snapshots
and the fresh benchmark output. Approved baselines and live screenshots remain
visible. Removed an unused duplicate mock helper block while preserving the actual
mock implementation paths.

## Final checks and limitations

| Check                                     | Result                                                                                                                                                           |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full coverage suite                       | 788 tests, 109 files passed                                                                                                                                      |
| Statements / branches / functions / lines | 95.90% / 87.93% / 96.17% / 96.47%                                                                                                                                |
| Existing coverage threshold script        | Passed, unchanged 60% requirement                                                                                                                                |
| Production build and lint                 | Passed; existing >500 kB bundle warning remains                                                                                                                  |
| Tooling behavioral tests                  | 5 passed                                                                                                                                                         |
| Compatible performance comparison         | Passed, +3.47%, unchanged 10% threshold                                                                                                                          |
| Static production reachability            | No inactive modules, dangling imports or nonliteral dynamic imports in the report scope                                                                          |
| Remaining ts-prune candidates             | Each has concrete references or an automatic Vitest mock retention reason in [retained-export-candidates.json](cleanup-evidence/retained-export-candidates.json) |
| Stricter unused compiler check            | Four pre-existing unused test parameters remain; no production findings. See [diagnostics](cleanup-evidence/final-unused-compiler.txt)                           |
| Whole-tree formatting                     | 18 untouched CSS files remain; broad CSS formatting is outside this cleanup                                                                                      |

Changed-file formatting and diff whitespace checks passed across surviving cleanup
files since checkpoint `511e5019`. Local file targets in all changed/new Markdown
resolve; the archived exceptions are documented adjacent to the unchanged archive.
Ignore checks confirm generated snapshots are ignored while approved baselines and
screenshots remain trackable. Final removal review matches the inspected inactive
families and disposable artifacts.

Coverage statements changed from 3,309 to 2,367 because inactive code was removed.
The [retained-module comparison](cleanup-evidence/retained-coverage-comparison.json)
shows stable or improved service/gateway/editor coverage. `playlistMixer` still has
the same two uncovered statements (97.05% to 97.01% due to its smaller denominator);
its branch coverage is unchanged. Thresholds were not lowered.

Live production smoke used the connected account and two documented accessible
sources: `0MhofKKypVO3mm9cGIJgnZ` (7 entries) and `5T7eowYuk28NiBUiPoOu14`
(240 entries). The older `3y6isGYmeVMudia1S2nAQq` playlist was inaccessible and
displayed the existing not-found/access notification; no empty-source success was
reported. Built-in Karimctiva applied to both sources. Count ratios produced six
tracks; a ten-minute target with time ratios produced three whole songs (about
12 minutes). All-song stop-first produced 14 tracks with time ratios and 11 with
count ratios; continuation produced 243 unique tracks with either ratio type.
These counts are observed with shuffle and source overlap, not deterministic quotas.

Manual `Diamante SONCE` search returned five results. Adding the same catalog track
twice changed the preview 6 → 7 → 8; removing one left 7. Keyboard drag moved the
remaining manual occurrence independently before `No Es Amor`. Connection renewal
succeeded at `2026-10-05T18:10:42.635Z`, preserving the exact edited order. Diagnostics
at `2026-10-05T18:10:48.040Z` returned 200 for account, owned playlists and search.
The naturally elapsed automatic timer was not separately waited for. No external
playlist save was initiated during cleanup. See the
[edited preview screenshot](cleanup-evidence/live-edited-preview.png).

UI/store DTO migration, provider expansion, a UI redesign, broad CSS formatting,
dependency upgrades and publication remain separately scoped. Local `.claude`
settings were left untouched.
