import {
  formatDuration,
  cleanPlaylistTracks,
  logDebugInfo,
} from '../mixerUtils';

describe('formatDuration', () => {
  it('returns 0:00 for negative values', () => {
    expect(formatDuration(-1)).toBe('0:00');
    expect(formatDuration(-1000)).toBe('0:00');
  });

  it('returns 0:00 for NaN', () => {
    expect(formatDuration(NaN)).toBe('0:00');
  });

  it('returns 0:00 for null/undefined', () => {
    expect(formatDuration(null as any)).toBe('0:00');
    expect(formatDuration(undefined as any)).toBe('0:00');
  });

  it('formats seconds correctly', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(1000)).toBe('0:01');
    expect(formatDuration(9000)).toBe('0:09');
    expect(formatDuration(10000)).toBe('0:10');
    expect(formatDuration(59000)).toBe('0:59');
  });

  it('formats minutes and seconds correctly', () => {
    expect(formatDuration(60000)).toBe('1:00');
    expect(formatDuration(61000)).toBe('1:01');
    expect(formatDuration(125000)).toBe('2:05');
    expect(formatDuration(599000)).toBe('9:59');
  });

  it('formats hours correctly', () => {
    expect(formatDuration(3600000)).toBe('60:00');
    expect(formatDuration(3661000)).toBe('61:01');
  });
});

describe('cleanPlaylistTracks and logging', () => {
  const validTrack = {
    id: 'track1',
    uri: 'spotify:track:1',
    name: 'Valid Track',
  };
  const invalidTrack = { id: '', uri: '', name: '' };
  const incompleteTrack = { id: 'track2', name: 'Missing URI' };

  it('returns empty object for null input', () => {
    expect(cleanPlaylistTracks(null as any)).toEqual({});
  });

  it('filters out invalid tracks from array playlists', () => {
    const input = {
      playlist1: [validTrack, invalidTrack, incompleteTrack],
      playlist2: [validTrack],
    };

    const result = cleanPlaylistTracks(input as any);
    expect(result.playlist1).toEqual([validTrack]);
    expect(result.playlist2).toEqual([validTrack]);
  });

  it('handles playlists with tracks property', () => {
    const input = {
      playlist1: {
        tracks: [validTrack, invalidTrack],
      },
    };

    const result = cleanPlaylistTracks(input as any);
    expect(result.playlist1).toEqual([validTrack]);
  });

  it('logs debug info in development mode', () => {
    process.env.NODE_ENV = 'development';
    process.env.TEST_VERBOSE = 'true';

    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    cleanPlaylistTracks({ playlist1: [validTrack, invalidTrack] } as any);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('logDebugInfo', () => {
  beforeEach(() => {
    jest
      .spyOn(Date.prototype, 'toISOString')
      .mockReturnValue('2025-08-22T12:34:56.789Z');
  });

  it('does not log in production environment', () => {
    process.env.NODE_ENV = 'production';
    process.env.TEST_VERBOSE = 'true';

    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    logDebugInfo('info' as any, 'test message');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('logs in development environment', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.TEST_VERBOSE;

    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    logDebugInfo('info' as any, 'test message');
    expect(spy).toHaveBeenCalledWith('ℹ️ [12:34:56] test message');
    spy.mockRestore();
  });

  it('logs when TEST_VERBOSE is true and not in production/test', () => {
    delete process.env.NODE_ENV;
    process.env.TEST_VERBOSE = 'true';

    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    logDebugInfo('info' as any, 'test message');
    expect(spy).toHaveBeenCalledWith('ℹ️ [12:34:56] test message');
    spy.mockRestore();
  });
});
