# Mixer performance checks

The Vitest benchmark runs in the normal suite and coverage CI. `npm run test:perf`
runs it alone. It creates 2,000 unique 180-second tracks by default, split across
three sources (1,000 / 600 / 400), with equal song-count ratios, shuffled source
order, all-song mode, and continuation disabled. Source exhaustion governs the
output: the default mix contains 1,200 tracks. Count and duration targets are
ignored in this mode; `PERF_TOTAL_SONGS` is no longer an input.

Two warmups precede five timed samples. The reported runtime is their median.
The test retains nonempty-output, exact source-exhaustion count, runtime, and
memory checks. Heap delta is informational for comparisons because garbage
collection can make it negative.

## Run and compare

```powershell
npm run test:perf
npm run perf:compare
# Optional larger source catalog; its workload needs its own matching baseline:
$env:PERF_TOTAL = '5000'
npm run test:perf
Remove-Item Env:PERF_TOTAL
```

`current-run.json` is generated and ignored. Approved baselines remain tracked.
Version-2 records contain workload options, source sizes, ratios, Node/Vitest
versions, CPU/platform/architecture, invocation context, commit, source digest,
timestamp, and run ID. The comparator rejects missing metrics, incompatible
workloads or runner contexts, stale runs (over 24 hours), and source mismatches.
CI sets an explicit run ID to prevent selecting a different run accidentally.

The comparator uses `last-baseline.json`. Exit 0 means a compatible run passes,
1 means correctness changed or runtime exceeded the **unchanged 10% threshold**,
and 2 means a valid comparison is unavailable. Output count equality is a
correctness requirement independent of timing. `PERF_REGRESS_THRESHOLD` remains
an explicit override; do not adjust it to hide a regression.

`PERF_BASELINE_PATH` and `PERF_CURRENT_PATH` select explicit records for diagnostics.
`npm run test:tooling` verifies timing regressions, correctness differences,
incompatibility, missing metrics, and stale/wrong-source provenance.

## Approve a baseline

After a standalone run on consistent hardware:

```powershell
$run = Get-Content src/__tests__/performance/baselines/current-run.json -Raw | ConvertFrom-Json
node scripts/approvePerfBaseline.js baseline-YYYY-MM-DD-local.json $run.provenance.runId
```

Choose a unique dated filename. Approval verifies the selected fresh run and
updates **both** the dated file and `last-baseline.json`; it refuses to overwrite
historical records. The August 2025 files are retained as historical evidence and
are incompatible with the new workload record.

The 5 October 2026 baseline was measured locally on Windows/Node 24.4.1. A GitHub
Ubuntu/Node 22.18.0 comparison needs a matching baseline: manually run **Approve
Perf Baseline** on GitHub to generate a fresh run and open a baseline PR. That
workflow installs dependencies, generates its own selected run, and lets the PR
action manage branch/commit creation. No GitHub run is claimed by local checks.
Shared hosted runners can vary; review CPU/context and variance before approving.

See [performance backlog](../../../docs/PERF_BACKLOG.md) for future stable-runner
and long-term artifact storage work.
