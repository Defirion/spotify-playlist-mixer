// Unit tests for mixer utility functions

import {
  safeObjectKeys,
  calculateTotalDuration,
  validateTrack,
  cleanPlaylistTracks,
  formatDuration,
  logDebugInfo,
} from '../mixerUtils';
import { SpotifyTrack } from '../../../types/spotify';

// Mock console methods for testing
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalEnv = process.env.NODE_ENV;

beforeEach(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
});

afterEach(() => {
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  process.env.NODE_ENV = originalEnv;
});

describe('safeObjectKeys', () => {
  it('should return keys for valid objects', () => {
    const obj = { a: 1, b: 2, c: 3 };
    const keys = safeObjectKeys(obj);
    expect(keys).toEqual(['a', 'b', 'c']);
  });

  it('should return empty array for null or undefined', () => {
    expect(safeObjectKeys(null)).toEqual([]);
    expect(safeObjectKeys(undefined)).toEqual([]);
  });

  it('should return empty array for non-objects', () => {
    expect(safeObjectKeys('string')).toEqual([]);
    expect(safeObjectKeys(123)).toEqual([]);
    expect(safeObjectKeys(true)).toEqual([]);
  });

  it('should handle empty objects', () => {
    expect(safeObjectKeys({})).toEqual([]);
  });

  it('should handle objects with prototype properties', () => {
    const obj = Object.create({ inherited: 'value' });
    obj.own = 'ownValue';
    const keys = safeObjectKeys(obj);
    expect(keys).toEqual(['own']);
  });
});

describe('calculateTotalDuration', () => {
  const createMockTrack = (duration_ms: number): SpotifyTrack => ({
    id: 'test-id',
    uri: 'spotify:track:test',
    name: 'Test Track',
    duration_ms,
    popularity: 50,
    explicit: false,
    preview_url: null,
    track_number: 1,
    artists: [],
    album: {
      id: 'album-id',
      name: 'Test Album',
      release_date: '2023-01-01',
      images: [],
      uri: 'spotify:album:test',
      external_urls: { spotify: 'https://open.spotify.com/album/test' },
    },
    external_urls: { spotify: 'https://open.spotify.com/track/test' },
  });

  it('should calculate total duration correctly', () => {
    const tracks = [
      createMockTrack(180000), // 3 minutes
      createMockTrack(240000), // 4 minutes
      createMockTrack(210000), // 3.5 minutes
    ];

    expect(calculateTotalDuration(tracks)).toBe(630000); // 10.5 minutes
  });

  it('should handle empty array', () => {
    expect(calculateTotalDuration([])).toBe(0);
  });

  it('should handle tracks with missing duration_ms', () => {
    const tracks = [
      createMockTrack(180000),
      { ...createMockTrack(0), duration_ms: undefined as any },
      createMockTrack(240000),
    ];

    expect(calculateTotalDuration(tracks)).toBe(420000);
  });

  it('should handle non-array input gracefully', () => {
    expect(calculateTotalDuration(null as any)).toBe(0);
    expect(calculateTotalDuration(undefined as any)).toBe(0);
    expect(calculateTotalDuration('not an array' as any)).toBe(0);
  });
});

describe('validateTrack', () => {
  const validTrack: SpotifyTrack = {
    id: 'test-id',
    uri: 'spotify:track:test',
    name: 'Test Track',
    duration_ms: 180000,
    popularity: 50,
    explicit: false,
    preview_url: null,
    track_number: 1,
    artists: [],
    album: {
      id: 'album-id',
      name: 'Test Album',
      release_date: '2023-01-01',
      images: [],
      uri: 'spotify:album:test',
      external_urls: { spotify: 'https://open.spotify.com/album/test' },
    },
    external_urls: { spotify: 'https://open.spotify.com/track/test' },
  };

  it('should return true for valid tracks', () => {
    expect(validateTrack(validTrack)).toBe(true);
  });

  it('should return false for null or undefined', () => {
    expect(validateTrack(null)).toBe(false);
    expect(validateTrack(undefined)).toBe(false);
  });

  it('should return false for non-objects', () => {
    expect(validateTrack('string')).toBe(false);
    expect(validateTrack(123)).toBe(false);
    expect(validateTrack(true)).toBe(false);
  });

  it('should return false for tracks missing required properties', () => {
    const invalidTrack1 = { ...validTrack, id: undefined };
    const invalidTrack2 = { ...validTrack, uri: '' };
    const invalidTrack3 = { ...validTrack, name: '' };

    expect(validateTrack(invalidTrack1)).toBe(false);
    expect(validateTrack(invalidTrack2)).toBe(false);
    expect(validateTrack(invalidTrack3)).toBe(false);
  });
});

describe('cleanPlaylistTracks', () => {
  const validTrack: SpotifyTrack = {
    id: 'test-id',
    uri: 'spotify:track:test',
    name: 'Test Track',
    duration_ms: 180000,
    popularity: 50,
    explicit: false,
    preview_url: null,
    track_number: 1,
    artists: [],
    album: {
      id: 'album-id',
      name: 'Test Album',
      release_date: '2023-01-01',
      images: [],
      uri: 'spotify:album:test',
      external_urls: { spotify: 'https://open.spotify.com/album/test' },
    },
    external_urls: { spotify: 'https://open.spotify.com/track/test' },
  };

  const invalidTrack = { id: '', uri: '', name: '' };

  it('should clean valid playlist tracks', () => {
    const input = {
      playlist1: [validTrack, invalidTrack],
      playlist2: [validTrack],
    };

    const result = cleanPlaylistTracks(input);

    expect(result).toEqual({
      playlist1: [validTrack],
      playlist2: [validTrack],
    });
  });

  it('should handle empty playlists', () => {
    const input = {
      playlist1: [],
      playlist2: [validTrack],
    };

    const result = cleanPlaylistTracks(input);

    expect(result).toEqual({
      playlist2: [validTrack],
    });
  });

  it('should handle invalid input gracefully', () => {
    expect(cleanPlaylistTracks(null)).toEqual({});
    expect(cleanPlaylistTracks(undefined)).toEqual({});
    expect(cleanPlaylistTracks('invalid')).toEqual({});
  });
});

describe('formatDuration', () => {
  it('should format duration correctly', () => {
    expect(formatDuration(180000)).toBe('3:00'); // 3 minutes
    expect(formatDuration(210000)).toBe('3:30'); // 3.5 minutes
    expect(formatDuration(65000)).toBe('1:05'); // 1:05
    expect(formatDuration(5000)).toBe('0:05'); // 5 seconds
  });

  it('should handle zero duration', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('should handle invalid input', () => {
    expect(formatDuration(-1000)).toBe('0:00');
    expect(formatDuration(NaN)).toBe('0:00');
    expect(formatDuration('invalid' as any)).toBe('0:00');
  });

  it('should pad seconds correctly', () => {
    expect(formatDuration(61000)).toBe('1:01');
    expect(formatDuration(69000)).toBe('1:09');
    expect(formatDuration(600000)).toBe('10:00');
  });
});

describe('logDebugInfo', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'development';
  });

  it('should log info messages in development', () => {
    logDebugInfo('info', 'Test info message');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('ℹ️'));
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Test info message')
    );
  });

  it('should log warning messages in development', () => {
    logDebugInfo('warn', 'Test warning message');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('⚠️'));
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Test warning message')
    );
  });

  it('should log error messages in development', () => {
    logDebugInfo('error', 'Test error message');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('❌'));
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Test error message')
    );
  });

  it('should not log in production', () => {
    process.env.NODE_ENV = 'production';
    logDebugInfo('info', 'Test message');
    expect(console.log).not.toHaveBeenCalled();
  });

  it('should include timestamp in log messages', () => {
    logDebugInfo('info', 'Test message');
    expect(console.log).toHaveBeenCalledWith(
      expect.stringMatching(/\[\d{2}:\d{2}:\d{2}\]/)
    );
  });
});
