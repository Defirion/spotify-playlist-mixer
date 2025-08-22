# Coverage exceptions and gap report

This document records intentional coverage exceptions and the highest-priority coverage gaps discovered from the most recent test run and the repository's coverage helper scripts.

Summary


# Coverage Exceptions and Gap Report

Snapshot metadata
- snapshot timestamp: 2025-08-22T05:14:46.040Z
- snapshot filename: coverage/snapshots/coverage-snapshot-2025-08-22T05-14-46-040Z.json

How this file was generated
- Run the full test suite with coverage and recorded a snapshot using:

```powershell
npm test -- --coverage --watchAll=false
npm run coverage:record
node scripts/compute-coverage-gaps.js
```

Summary
- Total files analyzed: 97
- Files below thresholds (statements < 95% OR branches < 85%): 45

Top lagging files (priority candidates)
1. src/test-utils/mocks/visualViewportMock.ts — statements 72.73%, branches 16.67%
2. src/components/SpotifySearchModal.tsx — statements 72.73%, branches 100%
3. src/components/ui/Modal.tsx — statements 79.07%, branches 72.41%
4. src/services/spotifyClient.ts — statements 81.25%, branches 75%
5. src/components/RatioConfig.tsx — statements 81.82%, branches 73.58%
6. src/components/TrackSourceModal.tsx — statements 83.33%, branches 87.14%
7. src/components/ScrollToBottom.tsx — statements 84.31%, branches 68.18%
8. src/components/SortableWrapper.tsx — statements 84.62%, branches 62.50%
9. src/services/_helpers/errorNormalizer.ts — statements 85%, branches 75.61%
10. src/test-utils/mocks/mixHooks.ts — statements 86.42%, branches 61.67%

Notes on intentional exceptions
- Type-only files and index re-exports are intentionally ignored by Jest configuration. Examples: `src/utils/mixer/types.ts` (0% statements). These are not actionable.
- Files that act as small shims or platform mocks (some files under `src/test-utils/mocks/`) may be lower-coverage by design; review before deciding to add tests.

Suggested next steps (short-term, low-risk)
- Add focused unit tests for `visualViewportMock.ts` to exercise branch logic and event-handling paths.
- Add behavior tests for `SpotifySearchModal.tsx` to cover the missing rendering branches (search open/empty/error states). Consider testing debouncing logic with fake timers.
- Add interaction tests for `Modal.tsx` covering focus management, escape/backdrop behavior, and transition branches.
- Add tests for `spotifyClient.ts` to cover error and retry branches (mock network responses) and token refresh handling.
- Audit `test-utils/mocks/*` files: where mocks are large, consider reducing their surface area or splitting to make them easier to test.

Suggested next steps (CI/fileing)
- Add CI guard: after `npm run coverage:record`, verify `coverage/coverage-final.json` contains `__snapshotTimestamp` and fail the step if missing. This prevents confusion when snapshots are stale.
- Add a one-line `npm run coverage:gaps` script that runs `node scripts/compute-coverage-gaps.js` and prints a machine-readable JSON for further CI automation.

Maintenance / documentation
- Keep this doc updated whenever a new snapshot is recorded. The snapshot metadata in `coverage-final.json` now contains `__snapshotTimestamp` and `__snapshotFilename` to help validate freshness.

If you'd like, I can:
- Open PR with a small test for `visualViewportMock.ts` (fast win).
- Add the CI guard script to fail when snapshot metadata is missing.
- Expand this doc with file-by-file recommended test cases and estimated effort.

  - Recommendation: If this file is just re-exports, mark it explicitly as excluded from coverage (add to `jest.coveragePathIgnorePatterns`) or add a tiny smoke test that imports it to ensure re-exports are covered. Effort: < 1 hour.

- `src/utils/mixer/types.ts` (or other `*types.ts`) — Statements: 0%
  - Why: types-only files. These should remain excluded; confirm `jest` ignore pattern covers them (current config ignores `src/types/.*\\.ts$` and similar patterns). Effort: none (documented here).

- `src/components/SpotifySearchModal.tsx` — Statements: ~72.7%
  - Why: missing tests that exercise the early-return and some branch paths (search empty state, error state, debounce/keyboard cases). Report shows uncovered lines 34–39.
  - Recommendation: Add unit tests covering: controlled/uncontrolled input flows, debounced search invocation, empty/results/error render states, keyboard selection. Effort: 2–3 hours.

- `src/components/ui/Modal.tsx` — Statements: ~79.1%
  - Why: focus management, backdrop interaction, and escape handling branches aren't fully covered (animation / timing edges). Uncovered lines include focus fallback and transition callbacks.
  - Recommendation: Add tests for focus trap, backdrop click, Escape key, and stacking behavior. Consider using fake timers for animation timing. Effort: 2–4 hours.

- `src/services/spotifyClient.ts` — Statements: ~81.3%
  - Why: some fetch/auth code paths or network-edge handling not covered (lines 40–41 show misses). Could be device-specific code or alternate flows.
  - Recommendation: Add unit tests for token refresh, error normalization, and network failure paths using mocks for fetch/undici. Effort: 2–3 hours.

- `src/test-utils/mocks/visualViewportMock.ts` — Branch coverage low
  - Why: platform-specific branches for VisualViewport may only run in certain environments.
  - Recommendation: either add tests that exercise both branches or mark it documented as environment-specific test helper. Effort: 1 hour.

Other smaller gaps
- `src/components/TrackList.tsx` and `src/components/ui/TrackList.tsx` — small uncovered branches around keyboard nav and virtualization; add targeted tests for keyboard events and virtualization edge cases. Effort: 1–2 hours.

How this list was produced
- I used the repository's own helper `tools/coverage_report.js` logic (thresholds: statements <95% or branches <85%) and inspected `coverage/coverage-final.json` to extract the highest-priority gaps. See `tools/coverage_report.js` for script logic.

Recommended process to reproduce and update
1. Run the full test suite with coverage:

```powershell
npm test -- --coverage --watchAll=false
```

2. Save a snapshot (project has a helper that writes into `coverage/snapshots/`):

```powershell
node scripts/record-coverage-snapshot.js
```

3. Optionally update coverage history (appends to `coverage-history.json`):

```powershell
node scripts/update-coverage-history.js

Important: persist the coverage JSON before recording a snapshot

Create React App / react-scripts sometimes writes the raw coverage output into a temporary folder (for example `tmp-coverage/coverage-final.json`) instead of `coverage/coverage-final.json` depending on how the test runner is invoked. The `scripts/record-coverage-snapshot.js` helper expects a `coverage/coverage-final.json` file to exist. If you run tests with coverage and the snapshot step reports that `coverage-final.json` is missing, copy the generated file from the temporary location first.

PowerShell (Windows):

```powershell
# run tests with coverage
npm test -- --coverage --watchAll=false

# if react-scripts put the file in tmp-coverage, copy it into coverage/
if (Test-Path .\tmp-coverage\coverage-final.json) { Copy-Item -Path .\tmp-coverage\coverage-final.json -Destination .\coverage\coverage-final.json -Force }

# now record the snapshot
npm run coverage:record
```

POSIX (macOS / Linux):

```bash
# run tests with coverage
npm test -- --coverage --watchAll=false

# if the file ended up in tmp-coverage, move/copy it
if [ -f tmp-coverage/coverage-final.json ]; then cp tmp-coverage/coverage-final.json coverage/coverage-final.json; fi

# now record the snapshot
npm run coverage:record
```

This ensures `coverage/coverage-final.json` exists and can be annotated by the snapshot script. After `npm run coverage:record` you can run `npm run coverage:verify` and `npm run coverage:gaps` as usual.
```

4. To produce a short JSON of lagging files locally, run the `tools/coverage_report.js` (edit the snapshot path inside the script to point at the newest snapshot) or run it from the repo root after adjusting the `snapshotPath` constant.

Acceptable exceptions & maintenance
- Add any intentionally excluded files to this document with a short justification and add them to `jest.coveragePathIgnorePatterns` where appropriate.
- For each file listed above, create a small ticket/PR that adds tests or documents the exception. Include the estimated effort above as a guide.

Next steps I can take (pick one)
- (A) Create PRs with targeted tests for the top 3 high-impact gaps (`SpotifySearchModal`, `Modal`, `spotifyClient`) and add tests with fake timers/mocks. Estimated: 6–10 hours.
- (B) Add explicit `coveragePathIgnorePatterns` entries for legitimate type-only/index files and update this doc. Estimated: 0.5 hour.
- (C) Run a per-test timing profiler to find slow tests and propose optimizations (helpful for 11.2). Estimated: 1–2 hours.

Requirements coverage mapping
- 11.1 Run coverage analysis: Done (covered by the snapshot and script references). Status: Done.
- 11.2 Measure execution time vs baseline: Done (timing compared; current run ~6.637s vs baseline ~6.0s). Status: Done (within allowed increase).
- 11.3 Validate test quality standards: Partially Done (we inspected structural issues; automated naming checks not yet implemented). Status: Deferred.

If you'd like, I can now (A) add the small ignore-pattern changes for the type/index files and push a commit, or (B) open the first PR that adds tests for `SpotifySearchModal.tsx`. Which do you want next?

---
Generated: by repository inspection and the project's coverage helper scripts.
