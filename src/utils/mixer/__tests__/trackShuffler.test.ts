// Unit tests for track shuffling module

import {
  shuffleArray,
  shuffleQuadrants,
  shuffleWithinGroups,
  getRandomTrack,
  getRandomTracks,
  conditionalShuffleQuadrants,
} from '../trackShuffler';
import {
  TrackWithPopularity,
  PopularityQuadrants,
  PopularityPools,
} from '../types';

// Mock track data for testing
const createMockTrack = (
  id: string,
  popularity: number = 50
): TrackWithPopularity => ({
  id,
  uri: `spotify:track:${id}`,
  name: `Track ${id}`,
  artists: [{ id: 'artist1', name: 'Artist 1', uri: 'spotify:artist:artist1' }],
  album: {
    id: 'album1',
    name: 'Album 1',
    uri: 'spotify:album:album1',
    release_date: '2023-01-01',
    images: [],
  },
  duration_ms: 180000,
  popularity,
  adjustedPopularity: popularity,
  basePopularity: popularity,
  recencyBonus: 0,
  releaseYear: 2023,
  explicit: false,
  preview_url: null,
  track_number: 1,
  disc_number: 1,
  external_ids: {},
  external_urls: {},
  href: '',
  is_local: false,
  is_playable: true,
  type: 'track',
});

const createMockQuadrants = (): PopularityQuadrants => ({
  topHits: [
    createMockTrack('top1', 90),
    createMockTrack('top2', 85),
    createMockTrack('top3', 80),
  ],
  popular: [createMockTrack('pop1', 70), createMockTrack('pop2', 65)],
  moderate: [createMockTrack('mod1', 50), createMockTrack('mod2', 45)],
  deepCuts: [createMockTrack('deep1', 30), createMockTrack('deep2', 25)],
});

describe('trackShuffler', () => {
  describe('shuffleArray', () => {
    it('should return a new array with the same elements', () => {
      const original = [1, 2, 3, 4, 5];
      const shuffled = shuffleArray(original);

      expect(shuffled).not.toBe(original); // Different array reference
      expect(shuffled).toHaveLength(original.length);
      expect(shuffled.sort()).toEqual(original.sort()); // Same elements when sorted
    });

    it('should handle empty arrays', () => {
      const result = shuffleArray([]);
      expect(result).toEqual([]);
    });

    it('should handle single-element arrays', () => {
      const original = ['single'];
      const result = shuffleArray(original);
      expect(result).toEqual(['single']);
      expect(result).not.toBe(original);
    });

    it('should not modify the original array', () => {
      const original = [1, 2, 3, 4, 5];
      const originalCopy = [...original];
      shuffleArray(original);
      expect(original).toEqual(originalCopy);
    });

    it('should produce different results on multiple calls (probabilistic)', () => {
      const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const results = Array.from({ length: 10 }, () => shuffleArray(original));

      // With 10 elements, it's extremely unlikely all shuffles would be identical
      const allIdentical = results.every(result =>
        result.every((val, idx) => val === results[0][idx])
      );
      expect(allIdentical).toBe(false);
    });

    it('should work with different data types', () => {
      const tracks = [
        createMockTrack('1'),
        createMockTrack('2'),
        createMockTrack('3'),
      ];
      const shuffled = shuffleArray(tracks);

      expect(shuffled).toHaveLength(3);
      expect(shuffled.map(t => t.id).sort()).toEqual(['1', '2', '3']);
    });
  });

  describe('shuffleQuadrants', () => {
    it('should shuffle tracks within each quadrant', () => {
      const quadrants = createMockQuadrants();
      const shuffled = shuffleQuadrants(quadrants);

      // Should have same structure
      expect(shuffled.topHits).toHaveLength(3);
      expect(shuffled.popular).toHaveLength(2);
      expect(shuffled.moderate).toHaveLength(2);
      expect(shuffled.deepCuts).toHaveLength(2);

      // Should contain same tracks (when sorted by ID)
      expect(shuffled.topHits.map(t => t.id).sort()).toEqual([
        'top1',
        'top2',
        'top3',
      ]);
      expect(shuffled.popular.map(t => t.id).sort()).toEqual(['pop1', 'pop2']);
      expect(shuffled.moderate.map(t => t.id).sort()).toEqual(['mod1', 'mod2']);
      expect(shuffled.deepCuts.map(t => t.id).sort()).toEqual([
        'deep1',
        'deep2',
      ]);
    });

    it('should not modify the original quadrants', () => {
      const quadrants = createMockQuadrants();
      const originalTopHits = [...quadrants.topHits];

      shuffleQuadrants(quadrants);

      expect(quadrants.topHits).toEqual(originalTopHits);
    });

    it('should handle empty quadrants', () => {
      const emptyQuadrants: PopularityQuadrants = {
        topHits: [],
        popular: [],
        moderate: [],
        deepCuts: [],
      };

      const result = shuffleQuadrants(emptyQuadrants);

      expect(result.topHits).toEqual([]);
      expect(result.popular).toEqual([]);
      expect(result.moderate).toEqual([]);
      expect(result.deepCuts).toEqual([]);
    });

    it('should handle quadrants with single tracks', () => {
      const singleTrackQuadrants: PopularityQuadrants = {
        topHits: [createMockTrack('single1')],
        popular: [createMockTrack('single2')],
        moderate: [],
        deepCuts: [createMockTrack('single3')],
      };

      const result = shuffleQuadrants(singleTrackQuadrants);

      expect(result.topHits).toHaveLength(1);
      expect(result.topHits[0].id).toBe('single1');
      expect(result.popular).toHaveLength(1);
      expect(result.popular[0].id).toBe('single2');
      expect(result.moderate).toHaveLength(0);
      expect(result.deepCuts).toHaveLength(1);
      expect(result.deepCuts[0].id).toBe('single3');
    });
  });

  describe('shuffleWithinGroups', () => {
    it('should shuffle tracks within groups for all playlists', () => {
      const popularityPools: PopularityPools = {
        playlist1: createMockQuadrants(),
        playlist2: createMockQuadrants(),
      };

      const shuffled = shuffleWithinGroups(popularityPools);

      // Should have same structure
      expect(Object.keys(shuffled)).toEqual(['playlist1', 'playlist2']);
      expect(shuffled.playlist1.topHits).toHaveLength(3);
      expect(shuffled.playlist2.topHits).toHaveLength(3);

      // Should contain same tracks
      expect(shuffled.playlist1.topHits.map(t => t.id).sort()).toEqual([
        'top1',
        'top2',
        'top3',
      ]);
      expect(shuffled.playlist2.topHits.map(t => t.id).sort()).toEqual([
        'top1',
        'top2',
        'top3',
      ]);
    });

    it('should not modify the original popularity pools', () => {
      const popularityPools: PopularityPools = {
        playlist1: createMockQuadrants(),
      };
      const originalTopHits = [...popularityPools.playlist1.topHits];

      shuffleWithinGroups(popularityPools);

      expect(popularityPools.playlist1.topHits).toEqual(originalTopHits);
    });

    it('should handle empty popularity pools', () => {
      const result = shuffleWithinGroups({});
      expect(result).toEqual({});
    });
  });

  describe('getRandomTrack', () => {
    const tracks = [
      createMockTrack('1'),
      createMockTrack('2'),
      createMockTrack('3'),
    ];

    it('should return a random track from the array', () => {
      const result = getRandomTrack(tracks);
      expect(result).not.toBeNull();
      expect(tracks.map(t => t.id)).toContain(result!.id);
    });

    it('should return null for empty arrays', () => {
      const result = getRandomTrack([]);
      expect(result).toBeNull();
    });

    it('should return null for null/undefined input', () => {
      expect(getRandomTrack(null as any)).toBeNull();
      expect(getRandomTrack(undefined as any)).toBeNull();
    });

    it('should exclude tracks based on excludeIds', () => {
      const excludeIds = new Set(['1', '2']);
      const result = getRandomTrack(tracks, excludeIds);

      expect(result).not.toBeNull();
      expect(result!.id).toBe('3');
    });

    it('should return null when all tracks are excluded', () => {
      const excludeIds = new Set(['1', '2', '3']);
      const result = getRandomTrack(tracks, excludeIds);

      expect(result).toBeNull();
    });

    it('should work without exclusion set', () => {
      const result = getRandomTrack(tracks);
      expect(result).not.toBeNull();
      expect(['1', '2', '3']).toContain(result!.id);
    });

    it('should produce different results over multiple calls (probabilistic)', () => {
      const largeTracks = Array.from({ length: 20 }, (_, i) =>
        createMockTrack(i.toString())
      );
      const results = Array.from({ length: 50 }, () =>
        getRandomTrack(largeTracks)
      );
      const uniqueIds = new Set(results.map(r => r!.id));

      // Should get multiple different tracks over 50 calls
      expect(uniqueIds.size).toBeGreaterThan(1);
    });
  });

  describe('getRandomTracks', () => {
    const tracks = [
      createMockTrack('1'),
      createMockTrack('2'),
      createMockTrack('3'),
      createMockTrack('4'),
      createMockTrack('5'),
    ];

    it('should return requested number of random tracks', () => {
      const result = getRandomTracks(tracks, 3);
      expect(result).toHaveLength(3);

      // All should be different tracks
      const ids = result.map(t => t.id);
      expect(new Set(ids).size).toBe(3);

      // All should be from original array
      ids.forEach(id => {
        expect(tracks.map(t => t.id)).toContain(id);
      });
    });

    it('should return empty array for empty input', () => {
      const result = getRandomTracks([], 3);
      expect(result).toEqual([]);
    });

    it('should return empty array for zero or negative count', () => {
      expect(getRandomTracks(tracks, 0)).toEqual([]);
      expect(getRandomTracks(tracks, -1)).toEqual([]);
    });

    it('should return all available tracks when count exceeds array length', () => {
      const result = getRandomTracks(tracks, 10);
      expect(result).toHaveLength(5);
      expect(result.map(t => t.id).sort()).toEqual(['1', '2', '3', '4', '5']);
    });

    it('should exclude tracks based on excludeIds', () => {
      const excludeIds = new Set(['1', '2']);
      const result = getRandomTracks(tracks, 2, excludeIds);

      expect(result).toHaveLength(2);
      result.forEach(track => {
        expect(excludeIds.has(track.id)).toBe(false);
      });
    });

    it('should return fewer tracks when many are excluded', () => {
      const excludeIds = new Set(['1', '2', '3', '4']);
      const result = getRandomTracks(tracks, 3, excludeIds);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('5');
    });

    it('should return empty array when all tracks are excluded', () => {
      const excludeIds = new Set(['1', '2', '3', '4', '5']);
      const result = getRandomTracks(tracks, 3, excludeIds);

      expect(result).toEqual([]);
    });

    it('should not modify the original array', () => {
      const originalTracks = [...tracks];
      getRandomTracks(tracks, 3);
      expect(tracks).toEqual(originalTracks);
    });
  });

  describe('conditionalShuffleQuadrants', () => {
    const quadrants = createMockQuadrants();

    it('should shuffle when shouldShuffle is true', () => {
      const result = conditionalShuffleQuadrants(quadrants, true);

      // Should have same structure and tracks
      expect(result.topHits).toHaveLength(3);
      expect(result.topHits.map(t => t.id).sort()).toEqual([
        'top1',
        'top2',
        'top3',
      ]);
    });

    it('should return original quadrants when shouldShuffle is false', () => {
      const result = conditionalShuffleQuadrants(quadrants, false);

      expect(result).toBe(quadrants); // Should be same reference
    });

    it('should not modify original quadrants when shuffling', () => {
      const originalTopHits = [...quadrants.topHits];
      conditionalShuffleQuadrants(quadrants, true);

      expect(quadrants.topHits).toEqual(originalTopHits);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle malformed track objects gracefully', () => {
      const malformedTracks = [
        { id: '1' } as any, // Missing required fields
        createMockTrack('2'),
      ];

      // Should not throw errors
      expect(() => shuffleArray(malformedTracks)).not.toThrow();
      expect(() => getRandomTrack(malformedTracks)).not.toThrow();
      expect(() => getRandomTracks(malformedTracks, 1)).not.toThrow();
    });

    it('should handle very large arrays efficiently', () => {
      const largeTracks = Array.from({ length: 10000 }, (_, i) =>
        createMockTrack(i.toString())
      );

      const start = Date.now();
      const shuffled = shuffleArray(largeTracks);
      const end = Date.now();

      expect(shuffled).toHaveLength(10000);
      expect(end - start).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should maintain randomness with repeated calls', () => {
      const tracks = Array.from({ length: 10 }, (_, i) =>
        createMockTrack(i.toString())
      );

      // Generate multiple shuffles and check they're not all identical
      const shuffles = Array.from({ length: 20 }, () =>
        shuffleArray(tracks)
          .map(t => t.id)
          .join(',')
      );

      const uniqueShuffles = new Set(shuffles);
      expect(uniqueShuffles.size).toBeGreaterThan(1);
    });
  });
});
