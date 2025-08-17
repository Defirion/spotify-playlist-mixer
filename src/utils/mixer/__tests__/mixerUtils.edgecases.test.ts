import {
  safeObjectKeys,
  calculateTotalDuration,
  cleanPlaylistTracks,
  formatDuration,
  logDebugInfo,
} from '../mixerUtils';

describe('mixerUtils edge cases', () => {
  const OLD_ENV = process.env.NODE_ENV;

  // Per-suite suppression of noisy logs (follow SILENCE_POLICY pattern #1)
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    // Intentionally do NOT mock console.warn here because some tests assert warn calls
  });

  afterEach(() => {
    process.env.NODE_ENV = OLD_ENV;
    jest.restoreAllMocks();
  });

  test('safeObjectKeys returns [] for non-object', () => {
    expect(safeObjectKeys(null)).toEqual([]);
    expect(safeObjectKeys(123)).toEqual([]);
  });

  // Note: test for Object.keys fallback removed to avoid global mutation of Object.keys in Jest environment

  test('calculateTotalDuration handles non-array input and invalid tracks', () => {
    process.env.NODE_ENV = 'development';
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    expect(calculateTotalDuration({} as any)).toBe(0);

    const tracks = [
      { id: '1', uri: 'u', name: 't', duration_ms: 1000 },
      { id: '2', uri: 'u2', name: 't2' } as any,
    ];
    expect(calculateTotalDuration(tracks as any)).toBe(1000);
    expect(warn).toHaveBeenCalled();
  });

  test('cleanPlaylistTracks normalizes different playlist shapes', () => {
    process.env.NODE_ENV = 'development';
    const input = {
      p1: [{ id: '1', uri: 'u', name: 'n', duration_ms: 1 }],
      p2: {
        tracks: [
          { id: '', uri: '', name: '' },
          { id: '2', uri: 'u2', name: 'n2' },
        ],
      },
      p3: 'invalid',
    } as any;

    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const cleaned = cleanPlaylistTracks(input);
    expect(Object.keys(cleaned).sort()).toEqual(['p1', 'p2']);
    expect(cleaned.p1[0].id).toBe('1');
    expect(cleaned.p2[0].id).toBe('2');
    expect(warn).toHaveBeenCalled();
  });

  test('formatDuration handles invalid and valid inputs', () => {
    expect(formatDuration(NaN)).toBe('0:00');
    expect(formatDuration(-100)).toBe('0:00');
    expect(formatDuration(90000)).toBe('1:30');
  });

  test('logDebugInfo only logs in development', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    process.env.NODE_ENV = 'development';
    logDebugInfo('info', 'testing', { a: 1 });
    expect(log).toHaveBeenCalled();

    log.mockClear();
    process.env.NODE_ENV = 'test';
    logDebugInfo('info', 'should not log');
    expect(log).not.toHaveBeenCalled();
  });
});
