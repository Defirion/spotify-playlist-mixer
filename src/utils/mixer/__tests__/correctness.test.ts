import { mixPlaylists } from '../playlistMixer';
import { MixOptions, RatioConfig } from '../../../types';
import { makeTrack } from '../../../test-utils/mocks/spotify';

const options: MixOptions = {
  totalSongs: 100,
  targetDurationSeconds: 3600,
  useAllSongs: true,
  useTimeLimit: false,
  continueWhenPlaylistEmpty: true,
  shuffleTracks: false,
  playlistName: 'Regression mix',
};
const tracks = (prefix: string, count: number, duration_ms = 180000) =>
  Array.from({ length: count }, (_, i) =>
    makeTrack({
      id: `${prefix}${i}`,
      uri: `spotify:track:${prefix}${i}`,
      duration_ms,
    })
  );

describe('correctness release mix semantics', () => {
  test('an initially empty source follows the explicit exhaustion policy', () => {
    const sources = { empty: [], usable: tracks('u', 5) };
    const ratios: RatioConfig = {
      empty: { min: 1, max: 1, weight: 1, weightType: 'frequency' },
      usable: { min: 1, max: 1, weight: 1, weightType: 'frequency' },
    };
    expect(
      mixPlaylists(sources, ratios, {
        ...options,
        continueWhenPlaylistEmpty: false,
      })
    ).toEqual([]);
    expect(mixPlaylists(sources, ratios, options)).toHaveLength(5);
  });
  test.each(['frequency', 'time'] as const)(
    'unequal sources respect both exhaustion policies (%s ratios)',
    weightType => {
      const sources = { short: tracks('s', 2), long: tracks('l', 20) };
      const ratios: RatioConfig = {
        short: { min: 1, max: 1, weight: 1, weightType },
        long: { min: 1, max: 1, weight: 1, weightType },
      };
      const continued = mixPlaylists(sources, ratios, options);
      expect(continued).toHaveLength(22);
      const stopped = mixPlaylists(sources, ratios, {
        ...options,
        continueWhenPlaylistEmpty: false,
      });
      expect(stopped.map(track => track.id)).toEqual(['s0', 'l0', 's1']);
    }
  );

  test('automatic mixing preserves deduplication within and across playlists', () => {
    const repeated = tracks('r', 1)[0];
    const sources = {
      a: [repeated, repeated, ...tracks('a', 2)],
      b: [repeated, ...tracks('b', 3)],
    };
    const ratios: RatioConfig = {
      a: { min: 1, max: 1, weight: 1, weightType: 'frequency' },
      b: { min: 1, max: 1, weight: 1, weightType: 'frequency' },
    };
    const result = mixPlaylists(sources, ratios, options);
    expect(result).toHaveLength(6);
    expect(new Set(result.map(track => track.id)).size).toBe(6);
    expect(new Set(result.map(track => track.instanceId)).size).toBe(6);
  });

  test('duration mode reaches 3600 seconds even with short songs and a small count target', () => {
    const sources = { a: tracks('a', 400, 10000) };
    const ratios: RatioConfig = {
      a: { min: 1, max: 1, weight: 1, weightType: 'frequency' },
    };
    const result = mixPlaylists(sources, ratios, {
      ...options,
      totalSongs: 1,
      useAllSongs: false,
      useTimeLimit: true,
    });
    expect(result).toHaveLength(360);
    expect(result.reduce((sum, track) => sum + track.duration_ms, 0)).toBe(
      3600000
    );
  });

  test('duration mode includes the whole song that reaches the target', () => {
    const result = mixPlaylists(
      { a: tracks('a', 5, 140000) },
      {
        a: { min: 1, max: 1, weight: 1, weightType: 'frequency' },
      },
      {
        ...options,
        useAllSongs: false,
        useTimeLimit: true,
        targetDurationSeconds: 300,
      }
    );
    expect(result).toHaveLength(3);
    expect(result.reduce((sum, track) => sum + track.duration_ms, 0)).toBe(
      420000
    );
  });

  test('all-songs precedence ignores an invalid inactive time target', () => {
    const result = mixPlaylists(
      { a: tracks('a', 5) },
      {
        a: { min: 1, max: 1, weight: 1, weightType: 'frequency' },
      },
      {
        ...options,
        useTimeLimit: true,
        targetDurationSeconds: 0,
        totalSongs: 1,
      }
    );
    expect(result).toHaveLength(5);
  });
});
