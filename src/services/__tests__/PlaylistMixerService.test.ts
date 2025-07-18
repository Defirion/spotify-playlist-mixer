import { PlaylistMixerService } from '../PlaylistMixerService';
import { Track, MixConfig, MixStrategy, Playlist, User } from '../../types';

describe('PlaylistMixerService', () => {
  let playlistMixerService: PlaylistMixerService;

  beforeEach(() => {
    playlistMixerService = new PlaylistMixerService();
  });

  // Helper function to create mock tracks
  const createMockTrack = (id: string, name: string, popularity: number = 50, duration_ms: number = 180000): Track => ({
    id,
    name,
    artists: [{ id: 'artist1', name: 'Test Artist', uri: 'spotify:artist:artist1' }],
    album: {
      id: 'album1',
      name: 'Test Album',
      artists: [{ id: 'artist1', name: 'Test Artist', uri: 'spotify:artist:artist1' }],
      images: [],
      release_date: '2023-01-01'
    },
    duration_ms,
    popularity,
    uri: `spotify:track:${id}`,
    preview_url: undefined
  });

  // Helper function to create mock playlist
  const createMockPlaylist = (id: string, name: string): Playlist => ({
    id,
    name,
    description: 'Test playlist',
    trackCount: 10,
    owner: { id: 'user1', displayName: 'Test User' } as User,
    images: []
  });

  // Helper function to create mock config
  const createMockConfig = (
    tracks1: Track[] = [],
    tracks2: Track[] = [],
    totalSongs: number = 10,
    strategy: MixStrategy = 'balanced'
  ): MixConfig => ({
    playlists: [
      {
        playlist: createMockPlaylist('playlist1', 'Playlist 1'),
        tracks: tracks1,
        config: { ratio: 1, isEnabled: true }
      },
      {
        playlist: createMockPlaylist('playlist2', 'Playlist 2'),
        tracks: tracks2,
        config: { ratio: 1, isEnabled: true }
      }
    ],
    ratioConfig: {
      playlist1: { ratio: 1, isEnabled: true },
      playlist2: { ratio: 1, isEnabled: true }
    },
    mixOptions: {
      totalSongs,
      strategy,
      shuffleWithinRatio: false,
      avoidConsecutiveSamePlaylist: false
    }
  });

  describe('validateMixConfig', () => {
    it('should validate a correct configuration', async () => {
      const config = createMockConfig(
        [createMockTrack('1', 'Track 1')],
        [createMockTrack('2', 'Track 2')]
      );

      const result = await playlistMixerService.validateMixConfig(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject null configuration', async () => {
      const result = await playlistMixerService.validateMixConfig(null as any);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Configuration is required');
    });

    it('should reject configuration without playlists', async () => {
      const config = {
        playlists: [],
        ratioConfig: {},
        mixOptions: { totalSongs: 10, strategy: 'balanced' as MixStrategy }
      } as MixConfig;

      const result = await playlistMixerService.validateMixConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one playlist is required');
    });

    it('should reject configuration without ratio config', async () => {
      const config = {
        playlists: [
          {
            playlist: createMockPlaylist('playlist1', 'Playlist 1'),
            tracks: [createMockTrack('1', 'Track 1')],
            config: { ratio: 1, isEnabled: true }
          }
        ],
        ratioConfig: {},
        mixOptions: { totalSongs: 10, strategy: 'balanced' as MixStrategy }
      } as MixConfig;

      const result = await playlistMixerService.validateMixConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Ratio configuration is required');
    });

    it('should reject configuration with zero total songs', async () => {
      const config = createMockConfig(
        [createMockTrack('1', 'Track 1')],
        [createMockTrack('2', 'Track 2')],
        0
      );

      const result = await playlistMixerService.validateMixConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Total songs must be greater than 0');
    });

    it('should reject configuration with playlists without tracks', async () => {
      const config = createMockConfig([], []);

      const result = await playlistMixerService.validateMixConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one playlist must have tracks');
    });

    it('should reject configuration with missing ratio config for playlists', async () => {
      const config = {
        playlists: [
          {
            playlist: createMockPlaylist('playlist1', 'Playlist 1'),
            tracks: [createMockTrack('1', 'Track 1')],
            config: { ratio: 1, isEnabled: true }
          }
        ],
        ratioConfig: {
          playlist2: { ratio: 1, isEnabled: true } // Missing playlist1
        },
        mixOptions: { totalSongs: 10, strategy: 'balanced' as MixStrategy }
      } as MixConfig;

      const result = await playlistMixerService.validateMixConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing ratio configuration for playlists: playlist1');
    });
  });

  describe('mixPlaylists', () => {
    it('should mix playlists according to equal ratios', async () => {
      const tracks1 = [
        createMockTrack('1', 'Track 1', 80),
        createMockTrack('2', 'Track 2', 70),
        createMockTrack('3', 'Track 3', 60)
      ];
      const tracks2 = [
        createMockTrack('4', 'Track 4', 90),
        createMockTrack('5', 'Track 5', 85),
        createMockTrack('6', 'Track 6', 75)
      ];

      const config = createMockConfig(tracks1, tracks2, 6);

      const result = await playlistMixerService.mixPlaylists(config);

      expect(result.tracks).toHaveLength(6);
      expect(result.metadata.sourcePlaylistCount).toBe(2);
      expect(result.metadata.strategy).toBe('balanced');
      expect(result.statistics.totalTracks).toBe(6);
      
      // Check that tracks from both playlists are included
      const playlist1Tracks = result.tracks.filter((t: any) => t.sourcePlaylist === 'playlist1');
      const playlist2Tracks = result.tracks.filter((t: any) => t.sourcePlaylist === 'playlist2');
      
      expect(playlist1Tracks.length).toBeGreaterThan(0);
      expect(playlist2Tracks.length).toBeGreaterThan(0);
    });

    it('should respect different ratios', async () => {
      const tracks1 = Array(10).fill(0).map((_, i) => createMockTrack(`1-${i}`, `Track 1-${i}`, 50));
      const tracks2 = Array(10).fill(0).map((_, i) => createMockTrack(`2-${i}`, `Track 2-${i}`, 50));

      const config: MixConfig = {
        playlists: [
          {
            playlist: createMockPlaylist('playlist1', 'Playlist 1'),
            tracks: tracks1,
            config: { ratio: 3, isEnabled: true }
          },
          {
            playlist: createMockPlaylist('playlist2', 'Playlist 2'),
            tracks: tracks2,
            config: { ratio: 1, isEnabled: true }
          }
        ],
        ratioConfig: {
          playlist1: { ratio: 3, isEnabled: true },
          playlist2: { ratio: 1, isEnabled: true }
        },
        mixOptions: {
          totalSongs: 12,
          strategy: 'balanced',
          shuffleWithinRatio: false,
          avoidConsecutiveSamePlaylist: false
        }
      };

      const result = await playlistMixerService.mixPlaylists(config);

      const playlist1Tracks = result.tracks.filter((t: any) => t.sourcePlaylist === 'playlist1');
      const playlist2Tracks = result.tracks.filter((t: any) => t.sourcePlaylist === 'playlist2');

      // With 3:1 ratio, playlist1 should have roughly 3x more tracks
      expect(playlist1Tracks.length).toBeGreaterThan(playlist2Tracks.length);
      expect(playlist1Tracks.length).toBeCloseTo(9, 2); // Approximately 9 out of 12
      expect(playlist2Tracks.length).toBeCloseTo(3, 2); // Approximately 3 out of 12
    });

    it('should handle disabled playlists', async () => {
      const tracks1 = [createMockTrack('1', 'Track 1')];
      const tracks2 = [createMockTrack('2', 'Track 2')];

      const config: MixConfig = {
        playlists: [
          {
            playlist: createMockPlaylist('playlist1', 'Playlist 1'),
            tracks: tracks1,
            config: { ratio: 1, isEnabled: true }
          },
          {
            playlist: createMockPlaylist('playlist2', 'Playlist 2'),
            tracks: tracks2,
            config: { ratio: 1, isEnabled: false }
          }
        ],
        ratioConfig: {
          playlist1: { ratio: 1, isEnabled: true },
          playlist2: { ratio: 1, isEnabled: false }
        },
        mixOptions: {
          totalSongs: 2,
          strategy: 'balanced',
          shuffleWithinRatio: false,
          avoidConsecutiveSamePlaylist: false
        }
      };

      const result = await playlistMixerService.mixPlaylists(config);

      // Should only include tracks from enabled playlist
      const playlist1Tracks = result.tracks.filter((t: any) => t.sourcePlaylist === 'playlist1');
      const playlist2Tracks = result.tracks.filter((t: any) => t.sourcePlaylist === 'playlist2');

      expect(playlist1Tracks.length).toBe(1);
      expect(playlist2Tracks.length).toBe(0);
    });

    it('should throw validation error for invalid config', async () => {
      const invalidConfig = createMockConfig([], [], 0);

      await expect(playlistMixerService.mixPlaylists(invalidConfig)).rejects.toMatchObject({
        type: 'VALIDATION',
        message: expect.stringContaining('Invalid mix configuration')
      });
    });
  });

  describe('previewMix', () => {
    it('should create a preview with limited tracks', async () => {
      const tracks1 = Array(50).fill(0).map((_, i) => createMockTrack(`1-${i}`, `Track 1-${i}`));
      const tracks2 = Array(50).fill(0).map((_, i) => createMockTrack(`2-${i}`, `Track 2-${i}`));

      const config = createMockConfig(tracks1, tracks2, 100);

      const result = await playlistMixerService.previewMix(config);

      expect(result.isPreview).toBe(true);
      expect(result.tracks.length).toBeLessThanOrEqual(20);
      expect(result.statistics).toBeDefined();
    });
  });

  describe('applyStrategy', () => {
    const tracks = [
      createMockTrack('1', 'Track 1', 90),
      createMockTrack('2', 'Track 2', 70),
      createMockTrack('3', 'Track 3', 50),
      createMockTrack('4', 'Track 4', 30)
    ];

    it('should apply front-loaded strategy', () => {
      const result = playlistMixerService.applyStrategy(tracks, 'front-loaded');
      
      // Should be sorted by popularity descending
      expect(result[0].popularity).toBeGreaterThanOrEqual(result[1].popularity!);
      expect(result[1].popularity).toBeGreaterThanOrEqual(result[2].popularity!);
      expect(result[2].popularity).toBeGreaterThanOrEqual(result[3].popularity!);
    });

    it('should apply crescendo strategy', () => {
      const result = playlistMixerService.applyStrategy(tracks, 'crescendo');
      
      // Should be sorted by popularity ascending
      expect(result[0].popularity).toBeLessThanOrEqual(result[1].popularity!);
      expect(result[1].popularity).toBeLessThanOrEqual(result[2].popularity!);
      expect(result[2].popularity).toBeLessThanOrEqual(result[3].popularity!);
    });

    it('should apply balanced strategy', () => {
      const result = playlistMixerService.applyStrategy(tracks, 'balanced');
      
      // Should return shuffled array (different order, same tracks)
      expect(result).toHaveLength(tracks.length);
      expect(result.map(t => t.id).sort()).toEqual(tracks.map(t => t.id).sort());
    });

    it('should apply random strategy', () => {
      const result = playlistMixerService.applyStrategy(tracks, 'random');
      
      // Should return shuffled array
      expect(result).toHaveLength(tracks.length);
      expect(result.map(t => t.id).sort()).toEqual(tracks.map(t => t.id).sort());
    });
  });

  describe('calculateMixStatistics', () => {
    it('should calculate correct statistics', async () => {
      const tracks = [
        { ...createMockTrack('1', 'Track 1', 80, 180000), sourcePlaylist: 'playlist1' },
        { ...createMockTrack('2', 'Track 2', 60, 200000), sourcePlaylist: 'playlist2' },
        { ...createMockTrack('3', 'Track 3', 40, 220000), sourcePlaylist: 'playlist1' }
      ] as any[];

      const config = createMockConfig([], [], 3);

      const result = await playlistMixerService.calculateMixStatistics(tracks, config);

      expect(result.totalTracks).toBe(3);
      expect(result.playlistDistribution.playlist1).toBe(2);
      expect(result.playlistDistribution.playlist2).toBe(1);
      expect(result.averagePopularity).toBe(60); // (80 + 60 + 40) / 3
      expect(result.totalDuration).toBe(10); // (180000 + 200000 + 220000) / 60000 = 10 minutes
    });

    it('should handle empty tracks array', async () => {
      const config = createMockConfig([], [], 0);

      const result = await playlistMixerService.calculateMixStatistics([], config);

      expect(result.totalTracks).toBe(0);
      expect(result.averagePopularity).toBe(0);
      expect(result.totalDuration).toBe(0);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle playlists with no valid tracks', async () => {
      const invalidTracks = [
        { id: '', name: 'Invalid Track 1' }, // Missing ID
        { id: 'track2', name: 'Invalid Track 2' } // Missing URI
      ] as Track[];

      const config = createMockConfig(invalidTracks, [createMockTrack('1', 'Valid Track')]);

      const result = await playlistMixerService.mixPlaylists(config);

      // Should only include valid tracks
      expect(result.tracks.length).toBeGreaterThan(0);
      expect(result.tracks.every(track => track.id && track.uri)).toBe(true);
    });

    it('should handle very small playlists', async () => {
      const config = createMockConfig(
        [createMockTrack('1', 'Only Track')],
        [],
        5
      );

      const result = await playlistMixerService.mixPlaylists(config);

      expect(result.tracks).toHaveLength(1);
      expect(result.tracks[0].id).toBe('1');
    });

    it('should not exceed requested total songs', async () => {
      const tracks1 = Array(100).fill(0).map((_, i) => createMockTrack(`1-${i}`, `Track 1-${i}`));
      const tracks2 = Array(100).fill(0).map((_, i) => createMockTrack(`2-${i}`, `Track 2-${i}`));

      const config = createMockConfig(tracks1, tracks2, 10);

      const result = await playlistMixerService.mixPlaylists(config);

      expect(result.tracks).toHaveLength(10);
    });

    it('should handle duplicate track IDs across playlists', async () => {
      const sharedTrack = createMockTrack('shared', 'Shared Track');
      const tracks1 = [sharedTrack, createMockTrack('1', 'Track 1')];
      const tracks2 = [sharedTrack, createMockTrack('2', 'Track 2')];

      const config = createMockConfig(tracks1, tracks2, 4);

      const result = await playlistMixerService.mixPlaylists(config);

      // Should not include the same track twice
      const trackIds = result.tracks.map(t => t.id);
      const uniqueTrackIds = [...new Set(trackIds)];
      expect(trackIds).toHaveLength(uniqueTrackIds.length);
    });
  });

  describe('popularity-based mixing', () => {
    it('should create popularity quadrants correctly', async () => {
      const tracks = [
        createMockTrack('1', 'Top Hit', 95),
        createMockTrack('2', 'Popular', 75),
        createMockTrack('3', 'Moderate', 55),
        createMockTrack('4', 'Deep Cut', 25),
        createMockTrack('5', 'Another Top Hit', 90),
        createMockTrack('6', 'Another Popular', 70),
        createMockTrack('7', 'Another Moderate', 50),
        createMockTrack('8', 'Another Deep Cut', 20)
      ];

      const config = createMockConfig(tracks, [], 8, 'front-loaded');

      const result = await playlistMixerService.mixPlaylists(config);

      expect(result.tracks).toHaveLength(8);
      
      // With front-loaded strategy, earlier tracks should generally be more popular
      const firstHalf = result.tracks.slice(0, 4);
      const secondHalf = result.tracks.slice(4, 8);
      
      const firstHalfAvgPopularity = firstHalf.reduce((sum, t) => sum + (t.popularity || 0), 0) / firstHalf.length;
      const secondHalfAvgPopularity = secondHalf.reduce((sum, t) => sum + (t.popularity || 0), 0) / secondHalf.length;
      
      expect(firstHalfAvgPopularity).toBeGreaterThanOrEqual(secondHalfAvgPopularity);
    });

    it('should apply crescendo strategy correctly', async () => {
      const tracks1 = [
        createMockTrack('1', 'Track 1', 20),
        createMockTrack('2', 'Track 2', 40),
        createMockTrack('3', 'Track 3', 60)
      ];
      
      const tracks2 = [
        createMockTrack('4', 'Track 4', 80),
        createMockTrack('5', 'Track 5', 100)
      ];

      const config = createMockConfig(tracks1, tracks2, 5, 'crescendo');

      const result = await playlistMixerService.mixPlaylists(config);

      // The service should return at least one track and have proper metadata
      expect(result.tracks.length).toBeGreaterThan(0);
      expect(result.metadata.strategy).toBe('crescendo');
      expect(result.statistics.totalTracks).toBe(result.tracks.length);
      
      // Test that the applyStrategy method works correctly for crescendo
      const allTracks = [...tracks1, ...tracks2];
      const crescendoResult = playlistMixerService.applyStrategy(allTracks, 'crescendo');
      
      // Should be sorted by popularity ascending
      expect(crescendoResult[0].popularity).toBeLessThanOrEqual(crescendoResult[1].popularity!);
      expect(crescendoResult[1].popularity).toBeLessThanOrEqual(crescendoResult[2].popularity!);
    });
  });
});