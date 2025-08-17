![Perf workflow status](https://github.com/Defirion/spotify-playlist-mixer/actions/workflows/perf.yml/badge.svg)

Performance tests and baselines

Overview

This folder contains a performance test for the playlist mixer and a small baseline comparison workflow.

Files

- `mixer.performance.test.ts` - Jest test that runs the mixer on synthetic playlists and writes `current-run.json` to `baselines/`.
- `baselines/last-baseline.json` - The most recent saved baseline.
- `baselines/current-run.json` - Written by the perf test after each run.
- `baselines/*.json` - Timestamped baseline artifacts.
- `scripts/comparePerf.js` - Node script that compares `current-run.json` to `last-baseline.json` and exits non-zero when regressions exceed the configured threshold.

How to run

Run the perf test (skips CI by default):

```powershell
npm run test:perf
```

To run a larger test, set environment variables in PowerShell before running:

```powershell
$env:PERF_TOTAL=5000; $env:PERF_TOTAL_SONGS=3000; npm run test:perf
```

Compare

After running the perf test, compare the current run to the baseline:

```powershell
npm run perf:compare
```

The default regression threshold is 10% and can be changed by setting `PERF_REGRESS_THRESHOLD` before running the compare script.

Notes

- The perf test writes `current-run.json` into `src/__tests__/performance/baselines/`.
- If you want to update the baseline after a trusted run, copy `current-run.json` to a timestamped file and update `last-baseline.json` accordingly.
- Keep perf tests out of CI by running them on dedicated hardware to reduce noise.

Tuning the threshold

- Observe the `perf` workflow for a few runs and note variance in `mixedCount` and `elapsedMs`.
- Set `PERF_REGRESS_THRESHOLD` in the workflow or locally when running `npm run perf:compare` to a conservative value (10% default). Tune down after you have a stable runner.

Backlog

See `docs/PERF_BACKLOG.md` for follow-ups like long-term S3 storage and dashboards.
