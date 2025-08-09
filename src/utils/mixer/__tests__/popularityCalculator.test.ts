// Unit tests for popularity calculator module

import {
  calculateRecencyBonus,
  calculateAdjustedPopularity,
  sortTracksByPopularity,
  getPopularityMetrics,
} from '../popularityCalculator';
import { SpotifyTrack } from '../../../types/spotify';
import { TrackWithPopularity } from '../types';

// Mock track factory
const createMockTrack = (
  overrides: Partial<SpotifyTrack> = {}
): SpotifyTrack => ({
  id: 'test-id',
  name: 'Test Track',
  artists: [
    {
      id: 'artist-1',
      name: 'Test Artist',
      uri: 'spotify:artist:1',
      external_urls: { spotify: 'https://spotify.com' },
    },
  ],
  album: {
    id: 'album-1',
    name: 'Test Album',
    images: [],
    release_date: '2023-01-01',
    uri: 'spotify:album:1',
    external_urls: { spotify: 'https://spotify.com' },
  },
  duration_ms: 180000,
  explicit: false,
  popularity: 50,
  preview_url: null,
  track_number: 1,
  uri: 'spotify:track:1',
  external_urls: { spotify: 'https://spotify.com' },
  ...overrides,
});

// Mock track with popularity factory
const createMockTrackWithPopularity = (
  overrides: Partial<TrackWithPopularity> = {}
): TrackWithPopularity => ({
  ...createMockTrack(),
  adjustedPopularity: 50,
  basePopularity: 50,
  recencyBonus: 0,
  releaseYear: 2023,
  ...overrides,
});

describe('popularityCalculator', () => {
  describe('calculateRecencyBonus', () => {
    beforeEach(() => {
      // Mock current date to 2024-01-01 for consistent testing
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return 0 for tracks older than 2 years', () => {
      const oldDate = new Date('2021-01-01'); // 3 years ago
      const bonus = calculateRecencyBonus(oldDate);
      expect(bonus).toBe(0);
    });

    it('should return maximum bonus (20) for very recent tracks', () => {
      const recentDate = new Date('2024-01-01'); // Today
      const bonus = calculateRecencyBonus(recentDate);
      expect(bonus).toBe(20);
    });

    it('should return partial bonus for tracks within 2 years', () => {
      const oneYearAgo = new Date('2023-01-01'); // 1 year ago
      const bonus = calculateRecencyBonus(oneYearAgo);
      expect(bonus).toBeGreaterThan(0);
      expect(bonus).toBeLessThan(20);
      // Should be approximately 10 (50% of max bonus for 1 year old)
      expect(bonus).toBeCloseTo(10, 0);
    });

    it('should return decreasing bonus as time increases', () => {
      const sixMonthsAgo = new Date('2023-07-01');
      const oneYearAgo = new Date('2023-01-01');
      const eighteenMonthsAgo = new Date('2022-07-01');

      const bonus6m = calculateRecencyBonus(sixMonthsAgo);
      const bonus1y = calculateRecencyBonus(oneYearAgo);
      const bonus18m = calculateRecencyBonus(eighteenMonthsAgo);

      expect(bonus6m).toBeGreaterThan(bonus1y);
      expect(bonus1y).toBeGreaterThan(bonus18m);
    });

    it('should handle edge case at exactly 2 years', () => {
      const exactlyTwoYears = new Date('2022-01-01');
      const bonus = calculateRecencyBonus(exactlyTwoYears);
      expect(bonus).toBe(0);
    });
  });

  describe('calculateAdjustedPopularity', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return base popularity when recency boost is disabled', () => {
      const track = createMockTrack({ popularity: 75 });
      const result = calculateAdjustedPopularity(track, false);

      expect(result.adjustedPopularity).toBe(75);
      expect(result.basePopularity).toBe(75);
      expect(result.recencyBonus).toBe(0);
      expect(result.releaseYear).toBe(2023);
    });

    it('should return base popularity when no release date is available', () => {
      const track = createMockTrack({
        popularity: 60,
        album: {
          ...createMockTrack().album,
          release_date: '',
        },
      });
      const result = calculateAdjustedPopularity(track, true);

      expect(result.adjustedPopularity).toBe(60);
      expect(result.basePopularity).toBe(60);
      expect(result.recencyBonus).toBe(0);
      expect(result.releaseYear).toBe('Unknown');
    });

    it('should apply recency boost for recent tracks', () => {
      const track = createMockTrack({
        popularity: 50,
        album: {
          ...createMockTrack().album,
          release_date: '2023-07-01', // 6 months ago
        },
      });
      const result = calculateAdjustedPopularity(track, true);

      expect(result.basePopularity).toBe(50);
      expect(result.recencyBonus).toBeGreaterThan(0);
      expect(result.adjustedPopularity).toBeGreaterThan(50);
      // The adjusted popularity uses the raw (unrounded) recency bonus for calculation
      expect(result.adjustedPopularity).toBeCloseTo(
        50 + result.recencyBonus,
        0
      );
      expect(result.releaseYear).toBe(2023);
    });

    it('should cap adjusted popularity at 100', () => {
      const track = createMockTrack({
        popularity: 95,
        album: {
          ...createMockTrack().album,
          release_date: '2024-01-01', // Today - maximum recency bonus
        },
      });
      const result = calculateAdjustedPopularity(track, true);

      expect(result.adjustedPopularity).toBe(100);
      expect(result.basePopularity).toBe(95);
      expect(result.recencyBonus).toBe(20);
    });

    it('should handle tracks with zero popularity', () => {
      const track = createMockTrack({
        popularity: 0,
        album: {
          ...createMockTrack().album,
          release_date: '2023-01-01',
        },
      });
      const result = calculateAdjustedPopularity(track, true);

      expect(result.basePopularity).toBe(0);
      expect(result.adjustedPopularity).toBeGreaterThan(0);
      expect(result.recencyBonus).toBeGreaterThan(0);
    });

    it('should handle missing popularity field', () => {
      const track = createMockTrack({ popularity: undefined as any });
      const result = calculateAdjustedPopularity(track, false);

      expect(result.basePopularity).toBe(0);
      expect(result.adjustedPopularity).toBe(0);
      expect(result.recencyBonus).toBe(0);
    });

    it('should round recency bonus to 1 decimal place', () => {
      const track = createMockTrack({
        popularity: 50,
        album: {
          ...createMockTrack().album,
          release_date: '2023-04-15', // Specific date to get non-round bonus
        },
      });
      const result = calculateAdjustedPopularity(track, true);

      // Check that recency bonus is rounded to 1 decimal
      expect(result.recencyBonus).toBe(
        Math.round(result.recencyBonus * 10) / 10
      );
    });
  });

  describe('sortTracksByPopularity', () => {
    it('should sort tracks by adjusted popularity in descending order', () => {
      const tracks: TrackWithPopularity[] = [
        createMockTrackWithPopularity({
          id: 'track-1',
          adjustedPopularity: 30,
        }),
        createMockTrackWithPopularity({
          id: 'track-2',
          adjustedPopularity: 80,
        }),
        createMockTrackWithPopularity({
          id: 'track-3',
          adjustedPopularity: 50,
        }),
        createMockTrackWithPopularity({
          id: 'track-4',
          adjustedPopularity: 90,
        }),
      ];

      const sorted = sortTracksByPopularity(tracks);

      expect(sorted.map(t => t.adjustedPopularity)).toEqual([90, 80, 50, 30]);
      expect(sorted.map(t => t.id)).toEqual([
        'track-4',
        'track-2',
        'track-3',
        'track-1',
      ]);
    });

    it('should handle tracks with equal popularity', () => {
      const tracks: TrackWithPopularity[] = [
        createMockTrackWithPopularity({
          id: 'track-1',
          adjustedPopularity: 50,
        }),
        createMockTrackWithPopularity({
          id: 'track-2',
          adjustedPopularity: 50,
        }),
        createMockTrackWithPopularity({
          id: 'track-3',
          adjustedPopularity: 60,
        }),
      ];

      const sorted = sortTracksByPopularity(tracks);

      expect(sorted[0].adjustedPopularity).toBe(60);
      expect(sorted[1].adjustedPopularity).toBe(50);
      expect(sorted[2].adjustedPopularity).toBe(50);
    });

    it('should return empty array for empty input', () => {
      const sorted = sortTracksByPopularity([]);
      expect(sorted).toEqual([]);
    });

    it('should not mutate the original array', () => {
      const tracks: TrackWithPopularity[] = [
        createMockTrackWithPopularity({
          id: 'track-1',
          adjustedPopularity: 30,
        }),
        createMockTrackWithPopularity({
          id: 'track-2',
          adjustedPopularity: 80,
        }),
      ];
      const originalOrder = tracks.map(t => t.id);

      sortTracksByPopularity(tracks);

      expect(tracks.map(t => t.id)).toEqual(originalOrder);
    });

    it('should handle single track', () => {
      const tracks: TrackWithPopularity[] = [
        createMockTrackWithPopularity({
          id: 'track-1',
          adjustedPopularity: 75,
        }),
      ];

      const sorted = sortTracksByPopularity(tracks);

      expect(sorted).toHaveLength(1);
      expect(sorted[0].id).toBe('track-1');
    });
  });

  describe('getPopularityMetrics', () => {
    it('should return zero metrics for empty array', () => {
      const metrics = getPopularityMetrics([]);

      expect(metrics.totalTracks).toBe(0);
      expect(metrics.averagePopularity).toBe(0);
      expect(metrics.averageRecencyBonus).toBe(0);
      expect(metrics.popularityRange).toEqual({ min: 0, max: 0 });
      expect(metrics.recencyBonusRange).toEqual({ min: 0, max: 0 });
      expect(metrics.releaseYearRange).toEqual({
        min: 'Unknown',
        max: 'Unknown',
      });
      expect(metrics.popularityDistribution).toEqual({
        topHits: 0,
        popular: 0,
        moderate: 0,
        deepCuts: 0,
      });
    });

    it('should calculate correct metrics for single track', () => {
      const tracks: TrackWithPopularity[] = [
        createMockTrackWithPopularity({
          adjustedPopularity: 75,
          basePopularity: 70,
          recencyBonus: 5,
          releaseYear: 2023,
        }),
      ];

      const metrics = getPopularityMetrics(tracks);

      expect(metrics.totalTracks).toBe(1);
      expect(metrics.averagePopularity).toBe(75);
      expect(metrics.averageRecencyBonus).toBe(5);
      expect(metrics.popularityRange).toEqual({ min: 75, max: 75 });
      expect(metrics.recencyBonusRange).toEqual({ min: 5, max: 5 });
      expect(metrics.releaseYearRange).toEqual({ min: 2023, max: 2023 });
      expect(metrics.popularityDistribution).toEqual({
        topHits: 0,
        popular: 1, // 60-79 range
        moderate: 0,
        deepCuts: 0,
      });
    });

    it('should calculate correct metrics for multiple tracks', () => {
      const tracks: TrackWithPopularity[] = [
        createMockTrackWithPopularity({
          adjustedPopularity: 90,
          recencyBonus: 10,
          releaseYear: 2024,
        }), // Top hit
        createMockTrackWithPopularity({
          adjustedPopularity: 70,
          recencyBonus: 5,
          releaseYear: 2023,
        }), // Popular
        createMockTrackWithPopularity({
          adjustedPopularity: 50,
          recencyBonus: 0,
          releaseYear: 2020,
        }), // Moderate
        createMockTrackWithPopularity({
          adjustedPopularity: 30,
          recencyBonus: 0,
          releaseYear: 2018,
        }), // Deep cut
      ];

      const metrics = getPopularityMetrics(tracks);

      expect(metrics.totalTracks).toBe(4);
      expect(metrics.averagePopularity).toBe(60); // (90+70+50+30)/4
      expect(metrics.averageRecencyBonus).toBe(3.8); // (10+5+0+0)/4 = 3.75, rounded to 3.8
      expect(metrics.popularityRange).toEqual({ min: 30, max: 90 });
      expect(metrics.recencyBonusRange).toEqual({ min: 0, max: 10 });
      expect(metrics.releaseYearRange).toEqual({ min: 2018, max: 2024 });
      expect(metrics.popularityDistribution).toEqual({
        topHits: 1, // 80-100: track with 90
        popular: 1, // 60-79: track with 70
        moderate: 1, // 40-59: track with 50
        deepCuts: 1, // 0-39: track with 30
      });
    });

    it('should handle tracks with string release years', () => {
      const tracks: TrackWithPopularity[] = [
        createMockTrackWithPopularity({
          adjustedPopularity: 50,
          releaseYear: 'Unknown',
        }),
        createMockTrackWithPopularity({
          adjustedPopularity: 60,
          releaseYear: 2023,
        }),
      ];

      const metrics = getPopularityMetrics(tracks);

      expect(metrics.releaseYearRange).toEqual({ min: 2023, max: 2023 });
    });

    it('should handle all tracks with unknown release years', () => {
      const tracks: TrackWithPopularity[] = [
        createMockTrackWithPopularity({
          adjustedPopularity: 50,
          releaseYear: 'Unknown',
        }),
        createMockTrackWithPopularity({
          adjustedPopularity: 60,
          releaseYear: 'Unknown',
        }),
      ];

      const metrics = getPopularityMetrics(tracks);

      expect(metrics.releaseYearRange).toEqual({
        min: 'Unknown',
        max: 'Unknown',
      });
    });

    it('should correctly categorize popularity distribution edge cases', () => {
      const tracks: TrackWithPopularity[] = [
        createMockTrackWithPopularity({ adjustedPopularity: 80 }), // Exactly 80 - should be top hit
        createMockTrackWithPopularity({ adjustedPopularity: 79 }), // Just below 80 - should be popular
        createMockTrackWithPopularity({ adjustedPopularity: 60 }), // Exactly 60 - should be popular
        createMockTrackWithPopularity({ adjustedPopularity: 59 }), // Just below 60 - should be moderate
        createMockTrackWithPopularity({ adjustedPopularity: 40 }), // Exactly 40 - should be moderate
        createMockTrackWithPopularity({ adjustedPopularity: 39 }), // Just below 40 - should be deep cut
      ];

      const metrics = getPopularityMetrics(tracks);

      expect(metrics.popularityDistribution).toEqual({
        topHits: 1, // 80
        popular: 2, // 79, 60
        moderate: 2, // 59, 40
        deepCuts: 1, // 39
      });
    });

    it('should round averages to 1 decimal place', () => {
      const tracks: TrackWithPopularity[] = [
        createMockTrackWithPopularity({
          adjustedPopularity: 33,
          recencyBonus: 3.33,
        }),
        createMockTrackWithPopularity({
          adjustedPopularity: 34,
          recencyBonus: 3.34,
        }),
        createMockTrackWithPopularity({
          adjustedPopularity: 35,
          recencyBonus: 3.35,
        }),
      ];

      const metrics = getPopularityMetrics(tracks);

      // (33+34+35)/3 = 34, (3.33+3.34+3.35)/3 = 3.34
      expect(metrics.averagePopularity).toBe(34);
      expect(metrics.averageRecencyBonus).toBe(3.3); // Rounded to 1 decimal
    });
  });
});
