import { performance } from 'perf_hooks';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { cpus } from 'os';
import { randomUUID } from 'crypto';
import { execFileSync } from 'child_process';
import { mixPlaylists, validateInputs } from '../../utils/mixer';
import { Track } from '../../types/domain';
import { MixOptions, RatioConfig } from '../../types/mixer';
import { version as vitestVersion } from 'vitest/package.json';
import { sourceHash } from '../../../scripts/perfRecord';

function makeTracks(count: number, prefix: string): Track[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index}`,
    title: `Track ${index}`,
    durationMs: 180000,
    artists: [`Artist ${index}`],
    sourceRefs: [],
  }));
}

// Included in the full Vitest suite and CI. Compare standalone runs on the same hardware.
test('all-song mixing with equal count ratios stops at the first exhausted source', () => {
  const total = Number(process.env.PERF_TOTAL || 2000);
  expect(Number.isInteger(total) && total >= 10).toBe(true);
  const sourceSizes = {
    p1: Math.ceil(total * 0.5),
    p2: Math.floor(total * 0.3),
    p3: 0,
  };
  sourceSizes.p3 = total - sourceSizes.p1 - sourceSizes.p2;
  const playlistTracks = Object.fromEntries(
    Object.entries(sourceSizes).map(([id, count]) => [
      id,
      makeTracks(count, id),
    ])
  );
  const ratioConfig: RatioConfig = Object.fromEntries(
    Object.keys(sourceSizes).map(id => [
      id,
      { min: 1, max: 1, weight: 1, weightType: 'frequency' },
    ])
  );
  const options: MixOptions = {
    totalSongs: 1,
    targetDurationSeconds: 0,
    useTimeLimit: false,
    useAllSongs: true,
    playlistName: 'perf-test',
    shuffleTracks: true,
    continueWhenPlaylistEmpty: false,
  };
  expect(validateInputs(playlistTracks, ratioConfig, options).isValid).toBe(
    true
  );
  const warmups = 2,
    samples = 5;
  for (let index = 0; index < warmups; index++)
    mixPlaylists(playlistTracks, ratioConfig, options);
  const heapBefore = process.memoryUsage().heapUsed;
  const timings: number[] = [];
  const counts: number[] = [];
  for (let index = 0; index < samples; index++) {
    const start = performance.now();
    const result = mixPlaylists(playlistTracks, ratioConfig, options);
    timings.push(performance.now() - start);
    counts.push(result.length);
  }
  const elapsedMs = [...timings].sort((a, b) => a - b)[Math.floor(samples / 2)];
  const heapDelta = process.memoryUsage().heapUsed - heapBefore;
  // The third source is smallest and is selected last in each equal-ratio round.
  for (const count of counts) expect(count).toBe(sourceSizes.p3 * 3);
  expect(counts[0]).toBeGreaterThan(0);
  expect(elapsedMs).toBeLessThan(120000);
  expect(heapDelta).toBeLessThan(1024 * 1024 * 1024);
  const metrics = {
    schemaVersion: 2,
    elapsedMs,
    heapDelta,
    mixedCount: counts[0],
    timings,
    workload: {
      mode: 'all',
      sourceSizes,
      ratioConfig,
      options,
      trackDurationMs: 180000,
      samples,
      warmups,
    },
    context: {
      node: process.version,
      vitest: vitestVersion,
      platform: process.platform,
      arch: process.arch,
      cpu: cpus()[0]?.model || 'unknown',
      runner:
        process.env.GITHUB_ACTIONS === 'true' ? 'github-actions' : 'local',
      invocation: process.env.npm_lifecycle_event || 'direct-vitest',
    },
    provenance: {
      runId: process.env.PERF_RUN_ID || randomUUID(),
      timestamp: new Date().toISOString(),
      commit: execFileSync('git', ['rev-parse', 'HEAD'], {
        encoding: 'utf8',
      }).trim(),
      sourceHash: sourceHash(),
    },
  };
  writeFileSync(
    join(__dirname, 'baselines/current-run.json'),
    JSON.stringify(metrics, null, 2) + '\n'
  );
  if (process.env.PERF_DEBUG === '1') console.log(metrics);
}, 120000);
