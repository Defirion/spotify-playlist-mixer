import {
  shouldContinueMixing,
  shouldStopDueToExhaustion,
} from '../mixingCalculations';

describe('mixingCalculations edge cases', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  test('shouldContinueMixing respects useTimeLimit and totalSongs', () => {
    const optionsTime: any = {
      useAllSongs: false,
      useTimeLimit: true,
      targetDurationSeconds: 60,
      totalSongs: 10,
    };
    const mixedTracks = [{ durationMs: 30 * 1000 }]; // 0.5 min
    expect(
      shouldContinueMixing(optionsTime, mixedTracks as any, { p1: false })
    ).toBe(true);

    const optionsCount: any = {
      useAllSongs: false,
      useTimeLimit: false,
      totalSongs: 1,
    };
    expect(shouldContinueMixing(optionsCount, mixedTracks as any, {})).toBe(
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
