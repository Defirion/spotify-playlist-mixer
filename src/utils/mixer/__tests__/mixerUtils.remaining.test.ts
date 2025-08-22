import {
  safeObjectKeys,
  calculateTotalDuration,
  cleanPlaylistTracks,
  logDebugInfo,
} from '../mixerUtils';

describe('mixerUtils remaining branches', () => {
  const origObjectKeys = Object.keys;
  const origNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    // restore any mutated globals
    Object.keys = origObjectKeys;
    process.env.NODE_ENV = origNodeEnv;
    delete process.env.TEST_VERBOSE;
    jest.restoreAllMocks();
  });

  it('falls back to manual keys when Object.keys returns non-array-like', () => {
    // Force Object.keys to return something invalid
    (Object as any).keys = jest.fn(() => ({ 0: 'a', 1: 'b' }) as any);
    process.env.TEST_VERBOSE = 'true';
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const result = safeObjectKeys({ a: 1, b: 2 });
    // restore immediately to avoid breaking expect internals which call Object.keys
    Object.keys = origObjectKeys as any;
    expect(result.sort()).toEqual(['a', 'b']);
    expect(spy).toHaveBeenCalled();
  });

  it('calculateTotalDuration returns 0 and warns on non-array input', () => {
    process.env.TEST_VERBOSE = 'true';
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(calculateTotalDuration(null as any)).toBe(0);
    expect(spy).toHaveBeenCalled();
  });

  it('calculateTotalDuration skips invalid track entries', () => {
    const tracks: any = [
      { id: 't1', duration_ms: 1000 },
      { id: 't2' },
      null,
      { id: 't3', duration_ms: 'bad' },
    ];
    expect(calculateTotalDuration(tracks)).toBe(1000);
  });

  it('calculateTotalDuration aggregates valid durations from mixed input', () => {
    const tracks = [
      { id: 'a', duration_ms: 1000 },
      { id: 'b' },
      { id: 'c', duration_ms: 2000 },
    ] as any;
    expect(calculateTotalDuration(tracks)).toBe(3000);
  });

  it('cleanPlaylistTracks handles wrapped tracks object and logs when verbose', () => {
    process.env.TEST_VERBOSE = '1';
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const input: any = {
      p1: {
        tracks: [
          { id: 'ok', uri: 'u', name: 'n', duration_ms: 1 },
          { id: 'bad' },
        ],
      },
      p2: 'not-an-array',
    };

    const out = cleanPlaylistTracks(input);
    expect(Array.isArray(out.p1)).toBe(true);
    expect(out.p1.length).toBe(1);
    expect(out.p2).toBeUndefined();
    expect(spy).toHaveBeenCalled();
  });

  it('cleanPlaylistTracks returns empty object and warns for invalid input', () => {
    process.env.TEST_VERBOSE = 'true';
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const out = cleanPlaylistTracks(null as any);
    expect(out).toEqual({});
    expect(spy).toHaveBeenCalled();
  });

  it('logDebugInfo logs when NODE_ENV=development and TEST_VERBOSE true', () => {
    process.env.NODE_ENV = 'development';
    process.env.TEST_VERBOSE = 'true';
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    logDebugInfo('info', 'msg', { a: 1 });
    expect(spy).toHaveBeenCalled();
  });

  it('logDebugInfo is a no-op in production', () => {
    process.env.NODE_ENV = 'production';
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    logDebugInfo('info', 'msg');
    expect(spy).not.toHaveBeenCalled();
  });
});
