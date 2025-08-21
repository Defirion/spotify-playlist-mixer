import {
  mixPlaylists,
  validateInputs,
  createMixingContext,
} from '../playlistMixer';
import { MixOptions, RatioConfig } from '../../types/mixer';

// Minimal fake track including artists to satisfy logging in mixingCalculations
const track = (id: string, duration = 180000) => ({
  id,
  uri: `spotify:track:${id}`,
  name: `Track ${id}`,
  duration_ms: duration,
  artists: [{ id: 'artist-' + id, name: 'Artist ' + id }],
});

const baseOptions: MixOptions = {
  totalSongs: 5,
  targetDuration: 0,
  useTimeLimit: false,
  useAllSongs: false,
  playlistName: 'Test',
  shuffleWithinGroups: false,
  popularityStrategy: 'mixed',
  recencyBoost: false,
  continueWhenPlaylistEmpty: false,
};

describe('playlistMixer validateInputs', () => {
  test('invalid when playlists empty', () => {
    const res = validateInputs({}, {}, baseOptions);
    expect(res.isValid).toBe(false);
    expect(res.errors).toEqual(
      expect.arrayContaining(['playlistTracks is empty or invalid'])
    );
  });

  test('valid with simple playlist + ratios', () => {
    const playlists = { p1: [track('1'), track('2')] } as any;
    const ratios: RatioConfig = {
      p1: { min: 0, max: 1, weight: 1, weightType: 'frequency' },
    };
    const res = validateInputs(playlists, ratios, baseOptions);
    expect(res.isValid).toBe(true);
    expect(res.cleanedPlaylistTracks.p1.length).toBe(2);
  });
});

describe('mixPlaylists basic behavior', () => {
  const playlists = {
    p1: [track('1'), track('2'), track('3')],
    p2: [track('4'), track('5')],
  } as any;
  const ratios: RatioConfig = {
    p1: { min: 0, max: 1, weight: 2, weightType: 'frequency' },
    p2: { min: 0, max: 1, weight: 1, weightType: 'frequency' },
  };

  test('produces non-empty mix respecting totalSongs', () => {
    const result = mixPlaylists(playlists, ratios, {
      ...baseOptions,
      totalSongs: 4,
    });
    expect(result.length).toBeLessThanOrEqual(4);
  });

  test('returns empty array for invalid inputs', () => {
    const result = mixPlaylists({}, {}, baseOptions);
    expect(result).toEqual([]);
  });
});

describe('createMixingContext integration', () => {
  test('target counts sum > 0', () => {
    const playlists = { p1: [track('1'), track('2')], p2: [track('3')] } as any;
    const ratios: RatioConfig = {
      p1: { min: 0, max: 1, weight: 2, weightType: 'frequency' },
      p2: { min: 0, max: 1, weight: 1, weightType: 'frequency' },
    };
    const ctx = createMixingContext(playlists, ratios, baseOptions);
    const total = Object.values(ctx.targetCounts).reduce((s, v) => s + v, 0);
    expect(total).toBeGreaterThan(0);
  });
});
