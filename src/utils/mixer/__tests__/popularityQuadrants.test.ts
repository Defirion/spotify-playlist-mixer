// Unit tests for popularity quadrants module

import { SpotifyTrack } from '../../../types/spotify';
import { PopularityQuadrants, PlaylistTracks, QuadrantOptions } from '../types';
import {
  createPopularityQuadrants,
  createPopularityPools,
  getQuadrantStats,
  validateQuadrants,
  getPopularityPoolsStats,
} from '../popularityQuadrants';

import {
  calculateAdjustedPopularity,
  sortTracksByPopularity,
} from '../popularityCalculator';
import { conditionalShuffleQuadrants } from '../trackShuffler';
import { safeObjectKeys, logDebugInfo } from '../mixerUtils';

// Mock the dependencies
jest.mock('../popularityCalculator');
jest.mock('../trackShuffler');
jest.mock('../mixerUtils');

const mockCalculateAdjustedPopularity =
  calculateAdjustedPopularity as jest.MockedFunction<
    typeof calculateAdjustedPopularity
  >;
const mockSortTracksByPopularity =
  sortTracksByPopularity as jest.MockedFunction<typeof sortTracksByPopularity>;
const mockConditionalShuffleQuadrants =
  conditionalShuffleQuadrants as jest.MockedFunction<
    typeof conditionalShuffleQuadrants
  >;
const mockSafeObjectKeys = safeObjectKeys as jest.MockedFunction<
  typeof safeObjectKeys
>;
const mockLogDebugInfo = logDebugInfo as jest.MockedFunction<
  typeof logDebugInfo
>;

// Mock data
const createMockTrack = (
  id: string,
  name: string,
  popularity: number,
  releaseDate?: string
): SpotifyTrack => ({
  id,
  name,
  uri: `spotify:track:${id}`,
  popularity,
  duration_ms: 180000,
  album: {
    id: `album-${id}`,
    name: `Album for ${name}`,
    release_date: releaseDate || '2020-01-01',
    images: [],
  },
  artists: [
    {
      id: `artist-${id}`,
      name: `Artist for ${name}`,
      uri: `spotify:artist:artist-${id}`,
    },
  ],
  external_urls: {
    spotify: `https://open.spotify.com/track/${id}`,
  },
});

const createMockTrackWithPopularity = (
  track: SpotifyTrack,
  adjustedPopularity: number
) => ({
  ...track,
  adjustedPopularity,
  basePopularity: track.popularity || 0,
  recencyBonus: adjustedPopularity - (track.popularity || 0),
  releaseYear: track.album?.release_date
    ? new Date(track.album.release_date).getFullYear()
    : 'Unknown',
});

describe('popularityQuadrants', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementations
    mockSafeObjectKeys.mockImplementation(obj => Object.keys(obj || {}));
    mockLogDebugInfo.mockImplementation(() => {});
    mockConditionalShuffleQuadrants.mockImplementation(quadrants => quadrants);
  });

  describe('createPopularityQuadrants', () => {
    it('should create quadrants from tracks with popularity data', () => {
      const tracks = [
        createMockTrack('1', 'Track 1', 90),
        createMockTrack('2', 'Track 2', 70),
        createMockTrack('3', 'Track 3', 50),
        createMockTrack('4', 'Track 4', 30),
      ];

      const tracksWithPopularity = tracks.map((track, index) =>
        createMockTrackWithPopularity(track, 90 - index * 20)
      );

      mockCalculateAdjustedPopularity
        .mockReturnValueOnce({
          adjustedPopularity: 90,
          basePopularity: 90,
          recencyBonus: 0,
          releaseYear: 2020,
        })
        .mockReturnValueOnce({
          adjustedPopularity: 70,
          basePopularity: 70,
          recencyBonus: 0,
          releaseYear: 2020,
        })
        .mockReturnValueOnce({
          adjustedPopularity: 50,
          basePopularity: 50,
          recencyBonus: 0,
          releaseYear: 2020,
        })
        .mockReturnValueOnce({
          adjustedPopularity: 30,
          basePopularity: 30,
          recencyBonus: 0,
          releaseYear: 2020,
        });

      mockSortTracksByPopularity.mockReturnValue(tracksWithPopularity);

      const result = createPopularityQuadrants(tracks, false);

      expect(result).toEqual({
        topHits: [tracksWithPopularity[0]], // Top 25%
        popular: [tracksWithPopularity[1]], // 25-50%
        moderate: [tracksWithPopularity[2]], // 50-75%
        deepCuts: [tracksWithPopularity[3]], // 75-100%
      });

      expect(mockCalculateAdjustedPopularity).toHaveBeenCalledTimes(4);
      expect(mockSortTracksByPopularity).toHaveBeenCalledWith(
        tracksWithPopularity
      );
    });

    it('should handle empty tracks array', () => {
      const result = createPopularityQuadrants([], false);

      expect(result).toEqual({
        topHits: [],
        popular: [],
        moderate: [],
        deepCuts: [],
      });

      expect(mockLogDebugInfo).toHaveBeenCalledWith(
        'warn',
        'createPopularityQuadrants received empty or invalid tracks array'
      );
    });

    it('should handle invalid input', () => {
      const result = createPopularityQuadrants(null as any, false);

      expect(result).toEqual({
        topHits: [],
        popular: [],
        moderate: [],
        deepCuts: [],
      });

      expect(mockLogDebugInfo).toHaveBeenCalledWith(
        'warn',
        'createPopularityQuadrants received empty or invalid tracks array'
      );
    });

    it('should handle single track', () => {
      const track = createMockTrack('1', 'Track 1', 90);
      const trackWithPopularity = createMockTrackWithPopularity(track, 90);

      mockCalculateAdjustedPopularity.mockReturnValue({
        adjustedPopularity: 90,
        basePopularity: 90,
        recencyBonus: 0,
        releaseYear: 2020,
      });
      mockSortTracksByPopularity.mockReturnValue([trackWithPopularity]);

      const result = createPopularityQuadrants([track], false);

      expect(result.topHits).toHaveLength(1);
      expect(result.popular).toHaveLength(0);
      expect(result.moderate).toHaveLength(0);
      expect(result.deepCuts).toHaveLength(0);
    });

    it('should pass recencyBoost parameter to calculateAdjustedPopularity', () => {
      const track = createMockTrack('1', 'Track 1', 90);
      const trackWithPopularity = createMockTrackWithPopularity(track, 95);

      mockCalculateAdjustedPopularity.mockReturnValue({
        adjustedPopularity: 95,
        basePopularity: 90,
        recencyBonus: 5,
        releaseYear: 2023,
      });
      mockSortTracksByPopularity.mockReturnValue([trackWithPopularity]);

      createPopularityQuadrants([track], true);

      expect(mockCalculateAdjustedPopularity).toHaveBeenCalledWith(track, true);
    });

    it('should log quadrant information in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const tracks = [
        createMockTrack('1', 'Track 1', 90),
        createMockTrack('2', 'Track 2', 70),
      ];

      const tracksWithPopularity = tracks.map((track, index) =>
        createMockTrackWithPopularity(track, 90 - index * 20)
      );

      mockCalculateAdjustedPopularity
        .mockReturnValueOnce({
          adjustedPopularity: 90,
          basePopularity: 90,
          recencyBonus: 0,
          releaseYear: 2020,
        })
        .mockReturnValueOnce({
          adjustedPopularity: 70,
          basePopularity: 70,
          recencyBonus: 0,
          releaseYear: 2020,
        });

      mockSortTracksByPopularity.mockReturnValue(tracksWithPopularity);

      createPopularityQuadrants(tracks, false);

      expect(mockLogDebugInfo).toHaveBeenCalledWith(
        'info',
        '📊 Popularity Quadrants Created (relative to this playlist):'
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('createPopularityPools', () => {
    it('should create popularity pools for multiple playlists', () => {
      const playlistTracks: PlaylistTracks = {
        playlist1: [
          createMockTrack('1', 'Track 1', 90),
          createMockTrack('2', 'Track 2', 70),
        ],
        playlist2: [
          createMockTrack('3', 'Track 3', 80),
          createMockTrack('4', 'Track 4', 60),
        ],
      };

      const options: QuadrantOptions = {
        recencyBoost: false,
        shuffleWithinGroups: false,
      };

      // Setup mocks for popularity calculation
      mockCalculateAdjustedPopularity
        .mockReturnValueOnce({
          adjustedPopularity: 90,
          basePopularity: 90,
          recencyBonus: 0,
          releaseYear: 2020,
        })
        .mockReturnValueOnce({
          adjustedPopularity: 70,
          basePopularity: 70,
          recencyBonus: 0,
          releaseYear: 2020,
        })
        .mockReturnValueOnce({
          adjustedPopularity: 80,
          basePopularity: 80,
          recencyBonus: 0,
          releaseYear: 2020,
        })
        .mockReturnValueOnce({
          adjustedPopularity: 60,
          basePopularity: 60,
          recencyBonus: 0,
          releaseYear: 2020,
        });

      // Setup mock for sorting
      mockSortTracksByPopularity
        .mockReturnValueOnce([
          createMockTrackWithPopularity(playlistTracks.playlist1[0], 90),
          createMockTrackWithPopularity(playlistTracks.playlist1[1], 70),
        ])
        .mockReturnValueOnce([
          createMockTrackWithPopularity(playlistTracks.playlist2[0], 80),
          createMockTrackWithPopularity(playlistTracks.playlist2[1], 60),
        ]);

      const result = createPopularityPools(playlistTracks, options);

      expect(result).toHaveProperty('playlist1');
      expect(result).toHaveProperty('playlist2');
      expect(mockSafeObjectKeys).toHaveBeenCalledWith(playlistTracks);
    });

    it('should handle empty playlists', () => {
      const playlistTracks: PlaylistTracks = {
        playlist1: [],
        playlist2: [createMockTrack('1', 'Track 1', 90)],
      };

      const options: QuadrantOptions = {
        recencyBoost: false,
        shuffleWithinGroups: false,
      };

      // Setup mocks for the non-empty playlist
      mockCalculateAdjustedPopularity.mockReturnValue({
        adjustedPopularity: 90,
        basePopularity: 90,
        recencyBonus: 0,
        releaseYear: 2020,
      });
      mockSortTracksByPopularity.mockReturnValue([
        createMockTrackWithPopularity(playlistTracks.playlist2[0], 90),
      ]);

      const result = createPopularityPools(playlistTracks, options);

      expect(result.playlist1).toEqual({
        topHits: [],
        popular: [],
        moderate: [],
        deepCuts: [],
      });
    });

    it('should handle invalid input', () => {
      const result = createPopularityPools(null as any, {
        recencyBoost: false,
        shuffleWithinGroups: false,
      });

      expect(result).toEqual({});
      expect(mockLogDebugInfo).toHaveBeenCalledWith(
        'warn',
        'createPopularityPools received invalid playlistTracks'
      );
    });

    it('should apply shuffling when shuffleWithinGroups is true', () => {
      const playlistTracks: PlaylistTracks = {
        playlist1: [createMockTrack('1', 'Track 1', 90)],
      };

      const options: QuadrantOptions = {
        recencyBoost: false,
        shuffleWithinGroups: true,
      };

      const mockQuadrants: PopularityQuadrants = {
        topHits: [
          createMockTrackWithPopularity(playlistTracks.playlist1[0], 90),
        ],
        popular: [],
        moderate: [],
        deepCuts: [],
      };

      // Setup mocks for popularity calculation
      mockCalculateAdjustedPopularity.mockReturnValue({
        adjustedPopularity: 90,
        basePopularity: 90,
        recencyBonus: 0,
        releaseYear: 2020,
      });
      mockSortTracksByPopularity.mockReturnValue([
        createMockTrackWithPopularity(playlistTracks.playlist1[0], 90),
      ]);

      createPopularityPools(playlistTracks, options);

      expect(mockConditionalShuffleQuadrants).toHaveBeenCalledWith(
        mockQuadrants,
        true
      );
    });
  });

  describe('getQuadrantStats', () => {
    it('should return correct statistics for populated quadrants', () => {
      const quadrants: PopularityQuadrants = {
        topHits: [
          createMockTrackWithPopularity(
            createMockTrack('1', 'Track 1', 90),
            90
          ),
          createMockTrackWithPopularity(
            createMockTrack('2', 'Track 2', 85),
            85
          ),
        ],
        popular: [
          createMockTrackWithPopularity(
            createMockTrack('3', 'Track 3', 70),
            70
          ),
        ],
        moderate: [
          createMockTrackWithPopularity(
            createMockTrack('4', 'Track 4', 50),
            50
          ),
        ],
        deepCuts: [],
      };

      const result = getQuadrantStats(quadrants);

      expect(result.totalTracks).toBe(4);
      expect(result.quadrantCounts).toEqual({
        topHits: 2,
        popular: 1,
        moderate: 1,
        deepCuts: 0,
      });
      expect(result.quadrantPercentages).toEqual({
        topHits: 50,
        popular: 25,
        moderate: 25,
        deepCuts: 0,
      });
      expect(result.averagePopularityByQuadrant.topHits).toBe(87.5);
      expect(result.averagePopularityByQuadrant.popular).toBe(70);
    });

    it('should handle empty quadrants', () => {
      const quadrants: PopularityQuadrants = {
        topHits: [],
        popular: [],
        moderate: [],
        deepCuts: [],
      };

      const result = getQuadrantStats(quadrants);

      expect(result.totalTracks).toBe(0);
      expect(result.quadrantCounts).toEqual({
        topHits: 0,
        popular: 0,
        moderate: 0,
        deepCuts: 0,
      });
    });
  });

  describe('validateQuadrants', () => {
    it('should validate properly formed quadrants', () => {
      const quadrants: PopularityQuadrants = {
        topHits: [
          createMockTrackWithPopularity(
            createMockTrack('1', 'Track 1', 90),
            90
          ),
        ],
        popular: [
          createMockTrackWithPopularity(
            createMockTrack('2', 'Track 2', 70),
            70
          ),
        ],
        moderate: [
          createMockTrackWithPopularity(
            createMockTrack('3', 'Track 3', 50),
            50
          ),
        ],
        deepCuts: [
          createMockTrackWithPopularity(
            createMockTrack('4', 'Track 4', 30),
            30
          ),
        ],
      };

      const result = validateQuadrants(quadrants);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.totalTracks).toBe(4);
      expect(result.hasEmptyQuadrants).toBe(false);
      expect(result.popularityOrderCorrect).toBe(true);
    });

    it('should detect missing quadrants', () => {
      const invalidQuadrants = {
        topHits: [],
        popular: [],
        // missing moderate and deepCuts
      } as any;

      const result = validateQuadrants(invalidQuadrants);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Missing quadrant: moderate');
      expect(result.issues).toContain('Missing quadrant: deepCuts');
    });

    it('should detect invalid quadrant types', () => {
      const invalidQuadrants = {
        topHits: 'not an array',
        popular: [],
        moderate: [],
        deepCuts: [],
      } as any;

      const result = validateQuadrants(invalidQuadrants);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Quadrant topHits is not an array');
    });

    it('should detect tracks with missing properties', () => {
      const quadrants: PopularityQuadrants = {
        topHits: [
          {
            id: '1',
            // missing uri and other required properties
          } as any,
        ],
        popular: [],
        moderate: [],
        deepCuts: [],
      };

      const result = validateQuadrants(quadrants);

      expect(result.isValid).toBe(false);
      expect(
        result.issues.some(issue =>
          issue.includes('missing required properties')
        )
      ).toBe(true);
    });

    it('should detect incorrect popularity order', () => {
      const quadrants: PopularityQuadrants = {
        topHits: [
          createMockTrackWithPopularity(
            createMockTrack('1', 'Track 1', 30),
            30
          ),
        ], // Low popularity in top hits
        popular: [
          createMockTrackWithPopularity(
            createMockTrack('2', 'Track 2', 90),
            90
          ),
        ], // High popularity in popular
        moderate: [
          createMockTrackWithPopularity(
            createMockTrack('3', 'Track 3', 50),
            50
          ),
        ],
        deepCuts: [
          createMockTrackWithPopularity(
            createMockTrack('4', 'Track 4', 70),
            70
          ),
        ],
      };

      const result = validateQuadrants(quadrants);

      expect(result.popularityOrderCorrect).toBe(false);
      expect(result.issues).toContain(
        'Popularity order is incorrect across quadrants'
      );
    });
  });

  describe('getPopularityPoolsStats', () => {
    it('should return statistics for multiple playlists', () => {
      const popularityPools = {
        playlist1: {
          topHits: [
            createMockTrackWithPopularity(
              createMockTrack('1', 'Track 1', 90),
              90
            ),
          ],
          popular: [
            createMockTrackWithPopularity(
              createMockTrack('2', 'Track 2', 70),
              70
            ),
          ],
          moderate: [],
          deepCuts: [],
        },
        playlist2: {
          topHits: [],
          popular: [
            createMockTrackWithPopularity(
              createMockTrack('3', 'Track 3', 60),
              60
            ),
          ],
          moderate: [
            createMockTrackWithPopularity(
              createMockTrack('4', 'Track 4', 40),
              40
            ),
          ],
          deepCuts: [],
        },
      };

      const result = getPopularityPoolsStats(popularityPools);

      expect(result.totalPlaylists).toBe(2);
      expect(result.totalTracks).toBe(4);
      expect(result.overallDistribution).toEqual({
        topHits: 1,
        popular: 2,
        moderate: 1,
        deepCuts: 0,
      });
      expect(result.playlistStats).toHaveProperty('playlist1');
      expect(result.playlistStats).toHaveProperty('playlist2');
    });

    it('should handle empty popularity pools', () => {
      const result = getPopularityPoolsStats({});

      expect(result.totalPlaylists).toBe(0);
      expect(result.totalTracks).toBe(0);
      expect(result.overallDistribution).toEqual({
        topHits: 0,
        popular: 0,
        moderate: 0,
        deepCuts: 0,
      });
    });
  });
});
