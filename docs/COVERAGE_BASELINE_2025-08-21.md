# Coverage Baseline (2025-08-21)

Baseline captured to support Phase 1 Task 1 of test coverage improvement plan.

## Current Overall Coverage

- Statements: 63.57% (baseline threshold guard currently set to 60%)
- Source: Generated via `npm test -- --coverage --watchAll=false`
- Enforcement: `scripts/check-coverage.js` (threshold configurable via `COVERAGE_THRESHOLD` env var)

## Key Low / Zero Coverage Targets (Phase 1 Focus)

| Area | Rationale |
| ---- | --------- |
| src/utils/accessibility.ts | Zero coverage, affects a11y regressions risk |
| src/utils/haptics.ts | Zero coverage, device capability branching |
| src/utils/migrateError.ts | Zero coverage, error normalization integrity |
| src/utils/playlistMixer.ts | Core mixing logic, high regression risk |
| src/services/spotify.ts | ~10% coverage, API/auth orchestration |
| src/services/fetchClient.ts | ~37% coverage, HTTP + retry logic |
| src/hooks/useMixGeneration.ts | Zero coverage, algorithm pipeline |
| src/hooks/useMixPreview.ts | Zero coverage, user preview experience |

(Exact percentages for individual files to be appended once targeted tests are added; initial snapshot extracts only global %.)

## Test Execution Performance Baseline

Captured from latest green run (2025-08-20 / 2025-08-21 window):
- Test suites: 109
- Tests: 823
- Approx runtime: capture via `record-test-metrics.js` script (see below) on next CI run to establish numeric baseline in ms.

## Tracking Data Models

Implemented in `src/types/testing.ts`:
- `CoverageTarget` — declarative target per file / group (file path globs, target %, priority tier, rationale).
- `TestingStrategy` — links a coverage target to planned test types (unit/integration/perf), risk notes, and status lifecycle.

These models feed future automation (e.g., generating a focused report of remaining gaps).

## History Files

A JSON history file `coverage-history.json` will accumulate snapshots with:
```
{
  date: string,            // ISO timestamp
  statementsPct: number,   // overall statements %
  suites: number,
  tests: number,
  runtimeMs: number | null // if metrics script was run in same pipeline
}
```
Script `scripts/update-coverage-history.js` appends entries (idempotent per date if rerun the same day).

## Next Steps (Phase 1 Task 1)
1. Run `npm test -- --coverage --watchAll=false` to refresh coverage.
2. Execute `npm run coverage:history` to append snapshot.
3. As individual target tests are added, update `CoverageTarget` entries (status -> "in-progress"/"complete").
4. Raise the enforced threshold gradually once overall coverage surpasses new safe floors (e.g., bump from 60 -> 65 after Phase 1 completion).

---
Generated automatically on 2025-08-21.
