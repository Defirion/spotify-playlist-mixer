import {
  calculateTargetCounts,
  shouldContinueMixing,
  shouldStopDueToExhaustion,
} from '../mixingCalculations';

describe('mixingCalculations edge cases', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());
  test('calculateTargetCounts uses time-based path when weightType=time', () => {
    const playlistTracks: any = {
      p1: Array.from({ length: 5 }, (_, i) => ({
        id: String(i),
        uri: 'u',
        name: 'n',
        duration_ms: 180000,
      })),
      p2: Array.from({ length: 10 }, (_, i) => ({
        id: String(i + 10),
        uri: 'u',
        name: 'n',
        duration_ms: 240000,
      })),
    };
    const ratioConfig: any = {
      p1: { weight: 1, weightType: 'time' },
      p2: { weight: 3, weightType: 'time' },
    };
    const options: any = {
      totalSongs: 10,
      targetDuration: 30,
      useTimeLimit: false,
      useAllSongs: true,
    };
    const playlistIds = ['p1', 'p2'];

    const res = calculateTargetCounts(
      playlistTracks,
      ratioConfig,
      options,
      playlistIds,
      4
    );
    expect(typeof res.estimatedTotalSongs).toBe('number');
    expect(res.targetCounts.p1).toBeDefined();
    expect(res.targetCounts.p2).toBeDefined();
  });

  test('calculateTargetCounts uses frequency-based path when no time weighting', () => {
    const playlistTracks: any = {
      a: new Array(3).fill({
        id: '1',
        uri: 'u',
        name: 'n',
        duration_ms: 200000,
      }),
    };
    const ratioConfig: any = { a: { weight: 1 } };
    const options: any = {
      totalSongs: 5,
      targetDuration: 10,
      useTimeLimit: false,
      useAllSongs: true,
    };
    const res = calculateTargetCounts(
      playlistTracks,
      ratioConfig,
      options,
      ['a'],
      1
    );
    expect(res.estimatedTotalSongs).toBeGreaterThan(0);
    expect(res.targetCounts.a).toBeGreaterThanOrEqual(0);
  });

  test('shouldContinueMixing respects useTimeLimit and totalSongs', () => {
    const optionsTime: any = {
      useAllSongs: false,
      useTimeLimit: true,
      targetDuration: 1,
      totalSongs: 10,
    };
    const mixedTracks = [{ duration_ms: 30 * 1000 }]; // 0.5 min
    expect(shouldContinueMixing(optionsTime, mixedTracks as any, 0, {})).toBe(
      true
    );

    const optionsCount: any = {
      useAllSongs: false,
      useTimeLimit: false,
      totalSongs: 1,
    };
    expect(shouldContinueMixing(optionsCount, mixedTracks as any, 0, {})).toBe(
      false
    );
  });

  test('shouldStopDueToExhaustion stops appropriately', () => {
    const exhausted: any = { a: true, b: false };
    expect(shouldStopDueToExhaustion(false, exhausted, 2)).toBe(true);
    expect(shouldStopDueToExhaustion(true, exhausted, 2)).toBe(false);
    const allExhausted: any = { a: true, b: true };
    expect(shouldStopDueToExhaustion(true, allExhausted, 2)).toBe(true);
  });
});
