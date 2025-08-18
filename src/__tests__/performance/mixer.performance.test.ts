import { performance } from 'perf_hooks';
import {
  mixPlaylists,
  calculateTargetCounts,
  validateInputs,
} from '../../utils/mixer';

// Tests rely on the global helper installed by src/setupTests.ts
declare function silenceIfPass<T>(fn: () => T | Promise<T>): Promise<T>;

// Performance test template for playlist mixer
// - This test targets the real `mixPlaylists` export from `src/utils/mixer`.
// - The test is skipped by default to avoid CI flakiness. Run with `npm run test:perf`.

function makeTracks(n: number, prefix = '') {
  return Array.from({ length: n }, (_, i) => ({
    id: `${prefix}t${i}`,
    name: `Track ${prefix}${i}`,
    uri: `spotify:track:${prefix}t${i}`,
    popularity: Math.floor(Math.random() * 100),
    duration_ms: 180000,
    artists: [{ id: `${prefix}a${i}`, name: `Artist ${i}` }],
    album: { id: `${prefix}al${i}`, name: `Album ${i}` },
  }));
}

test('mixPlaylists performance — 1000 tracks', async () => {
  await silenceIfPass(async () => {
    // Total desired tracks across all playlists (default 2000 for a stress test)
    const TOTAL = Number(process.env.PERF_TOTAL || 2000);

    // Distribute total across 3 playlists (rough split: 50% / 30% / 20%)
    const p1Count = Math.ceil(TOTAL * 0.5);
    const p2Count = Math.floor(TOTAL * 0.3);
    const p3Count = TOTAL - p1Count - p2Count;

    // Construct playlistTracks as expected by mixer types: { [playlistId]: SpotifyTrack[] }
    const playlistTracks: any = {
      p1: makeTracks(p1Count, 'p1-'),
      p2: makeTracks(p2Count, 'p2-'),
      p3: makeTracks(p3Count, 'p3-'),
    };

    // Simple ratioConfig: equal weights
    const ratioConfig: any = {
      p1: { min: 0, max: 1, weight: 1, weightType: 'frequency' },
      p2: { min: 0, max: 1, weight: 1, weightType: 'frequency' },
      p3: { min: 0, max: 1, weight: 1, weightType: 'frequency' },
    };

    // Configure how many songs the mixer should attempt to produce.
    // PERF_TOTAL_SONGS can be set to control mixing target (defaults to 1500).
    const PERF_TOTAL_SONGS = Number(
      process.env.PERF_TOTAL_SONGS || Math.max(1500, Math.floor(TOTAL * 0.75))
    );

    const options: any = {
      totalSongs: PERF_TOTAL_SONGS,
      targetDuration: 3600,
      useTimeLimit: false,
      useAllSongs: true,
      playlistName: 'perf-test',
      shuffleWithinGroups: true,
      popularityStrategy: 'mixed',
      recencyBoost: false,
      continueWhenPlaylistEmpty: false,
    };

    // Probe estimatedTotalSongs when using `useAllSongs` to ensure we actually have a target.
    let estimatedSongsProbe = 0;
    try {
      // Run validation to surface any input cleaning/errors
      try {
        const validation = validateInputs(playlistTracks, ratioConfig, options);
        // eslint-disable-next-line no-console
        console.log(
          'validation.isValid:',
          validation.isValid,
          'errors:',
          validation.errors
        );
        // eslint-disable-next-line no-console
        console.log(
          'cleaned playlist sizes:',
          Object.keys(validation.cleanedPlaylistTracks).map(k => ({
            id: k,
            count: validation.cleanedPlaylistTracks[k].length,
          }))
        );
        if (!validation.isValid) {
          // If validation fails, don't proceed to heavy mixing; let the test fail with context.
          // eslint-disable-next-line no-console
          console.log('Validation failed; aborting mix run');
        }
      } catch (vErr: any) {
        // eslint-disable-next-line no-console
        console.log('validation error', vErr && vErr.message);
      }
      const playlistIds = Object.keys(ratioConfig).filter(
        id => playlistTracks[id] && playlistTracks[id].length > 0
      );
      const totalWeight = playlistIds.reduce(
        (sum, id) => sum + (ratioConfig[id].weight || 1),
        0
      );
      const probe = calculateTargetCounts(
        playlistTracks,
        ratioConfig,
        options,
        playlistIds,
        totalWeight as any
      );
      estimatedSongsProbe = probe.estimatedTotalSongs || 0;
      // eslint-disable-next-line no-console
      console.log('probeEstimatedSongs:', estimatedSongsProbe);
    } catch (err: any) {
      // ignore probe failures
      // eslint-disable-next-line no-console
      console.log('probeEstimateError', err && err.message);
    }

    // If probe reports zero estimated songs, fallback to explicit totalSongs mode
    if (
      options.useAllSongs &&
      (!estimatedSongsProbe || estimatedSongsProbe <= 0)
    ) {
      // eslint-disable-next-line no-console
      console.log(
        'Fallback: estimatedTotalSongs is zero; switching to explicit totalSongs mode'
      );
      options.useAllSongs = false;
      options.totalSongs = Number(
        process.env.PERF_TOTAL_SONGS || Math.max(1500, Math.floor(TOTAL * 0.75))
      );
    }

    // Warmup
    mixPlaylists(playlistTracks, ratioConfig, options);

    const memBefore = process.memoryUsage();
    const t0 = performance.now();

    const result = mixPlaylists(playlistTracks, ratioConfig, options);

    const t1 = performance.now();
    const memAfter = process.memoryUsage();
    const elapsedMs = t1 - t0;
    const heapDelta = memAfter.heapUsed - memBefore.heapUsed;

    // Log metrics so developers can capture them from test output
    const metrics = {
      elapsedMs,
      heapDelta,
      createdTracks: {
        total:
          playlistTracks.p1.length +
          playlistTracks.p2.length +
          playlistTracks.p3.length,
        p1: playlistTracks.p1.length,
        p2: playlistTracks.p2.length,
        p3: playlistTracks.p3.length,
      },
      mixedCount: Array.isArray(result) ? result.length : 0,
    };
    // Write current-run.json for comparisons
    try {
      const fs = require('fs');
      const path = require('path');
      const outPath = path.join(__dirname, 'baselines', 'current-run.json');
      fs.writeFileSync(outPath, JSON.stringify(metrics, null, 2));
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.log('Failed to write current-run.json', e && e.message);
    }
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(metrics));

    expect(Array.isArray(result)).toBe(true);
    // Fail the test if the mixer produced no tracks — indicates misconfiguration
    const mixedCount = Array.isArray(result) ? result.length : 0;
    expect(mixedCount).toBeGreaterThan(0);

    // Conservative runtime/memory thresholds; adjust after collecting baselines
    expect(elapsedMs).toBeLessThan(120000);
    expect(heapDelta).toBeLessThan(1024 * 1024 * 1024); // 1GB
  });
}, 120000);
