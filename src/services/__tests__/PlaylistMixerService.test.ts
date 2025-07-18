import { PlaylistMixerService } from '../PlaylistMixerService';
import { MixConfig, Track, Playlist, User, MixStrategy } from '../../types';

describe('PlaylistMixerService', () => {
  let mixerService: PlaylistMixerService;

  beforeEach(() => {
    mixerService = new PlaylistMixerService();
  });

  // Helper function to create mock tracks
  const createMockTrack = (id: string, name: string, popularity: number = 50, duration: number = 180000): Track => ({
    id,
    name,
    artists: [{ id: 'artist1', name: 'Artist 1', uri: 'spotify:artist:artist1' }],
    album: {
      id: 'album1',
      name: 'Album 1',
      artists: [{ id: 'artist1', name: 'Artist 1', uri: 'spotify:artist:artist1' }],
      images: [],
      release_date: '2023-01-01'
    },
    duration_ms: duration,
    popularity,
    uri: `spotify:track:${id}`
  });

  // Helper function to create mock playlist
  const createMockPlaylist = (id: string, name: string): Playlist => ({
    id,
    name,
    trackCount: 0,
    owner: { id: 'user1', displayName: 'Test User' } as User,
    images: []
  });

  // Helper function to create mock mix config
  const createMockMixConfig = (
    playlists: Array<{ playlist: Playlist; tracks: Track[] }>,
    ratios: { [key: string]: { ratio: number; isEnabled: boolean } },
    totalSongs: number = 50
  ): MixConfig => ({
    playlists: playlists.map(p => ({
      playlist: p.playlist,
      tracks: p.tracks,
      config: ratios[p.playlist.id]
    })),
    ratioConfig: ratios,
    mixOptions: {
      shuffleWithinRatio: false,
      avoidConsecutiveSamePlaylist: false,
      strategy: 'balanced' as MixStrategy,
      totalSongs
    }
  });

  describe('validateMixConfig', () => {
    it('should validate a correct mix configuration', async () => {
      const playlist1 = createMockPlaylist('p1', 'Playlist 1');
      const tracks1 = [createMockTrack('t1', 'Track 1'), createMockTrack('t2', 'Track 2')];
      
      const config = createMockMixConfig(
        [{ playlist: playlist1, tracks: tracks1 }],
        { p1: { ratio: 1, isEnabled: true } }
      );

      const result = await mixerService.validateMixConfig(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject null or undefined configuration', async () => {
      const result = await mixerService.validateMixConfig(null as any);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Configuration is required');
    });

    it('should reject configuration with no playlists', async () => {
      const config = createMockMixConfig([], {});

      const result = await mixerService.validateMixConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one playlist is required');
    });

    it('should reject configuration with no ratio config', async () => {
      const playlist1 = createMockPlaylist('p1', 'Playlist 1');
      const tracks1 = [createMockTrack('t1', 'Track 1')];
      
      const config: MixConfig = {
        playlists: [{ playlist: playlist1, tracks: tracks1, config: { ratio: 1, isEnabled: true } }],
        ratioConfig: {},
        mixOptions: {
          shuffleWithinRatio: false,
          avoidConsecutiveSamePlaylist: false,
          strategy: 'balanced',
          totalSongs: 50
        }
      };

      const result = await mixerService.validateMixConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Ratio configuration is required');
    });

    it('should reject configuration with invalid total songs', async () => {
      const playlist1 = createMockPlaylist('p1', 'Playlist 1');
      const tracks1 = [createMockTrack('t1', 'Track 1')];
      
      const config = createMockMixConfig(
        [{ playlist: playlist1, tracks: tracks1 }],
        { p1: { ratio: 1, isEnabled: true } },
        -5
      );

      const result = await mixerService.validateMixConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Total songs must be greater than 0');
    });

    it('should reject configuration with playlists that have no tracks', async () => {
      const playlist1 = createMockPlaylist('p1', 'Playlist 1');
      
      const config = createMockMixConfig(
        [{ playlist: playlist1, tracks: [] }],
        { p1: { ratio: 1, isEnabled: true } }
      );

      const result = await mixerService.validateMixConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one playlist must have tracks');
    });

    it('should reject configuration with missing ratio config for playlists', async () => {
      const playlist1 = createMockPlaylist('p1', 'Playlist 1');
      const playlist2 = createMockPlaylist('p2', 'Playlist 2');
      const tracks1 = [createMockTrack('t1', 'Track 1')];
      const tracks2 = [createMockTrack('t2', 'Track 2')];
      
      const config = createMockMixConfig(
        [
          { playlist: playlist1, tracks: tracks1 },
          { playlist: playlist2, tracks: tracks2 }
        ],
        { p1: { ratio: 1, isEnabled: true } } // Missing p2
      );

      const result = await mixerService.validateMixConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing ratio configuration for playlists: p2');
    });
  });

  describe('mixPlaylists', () => {
    it('should create a mix with correct number of tracks', async () => {
      const playlist1 = createMockPlaylist('p1', 'Playlist 1');
      const playlist2 = createMockPlaylist('p2', 'Playlist 2');
      
      const tracks1 = Array(20).fill(null).map((_, i) => createMockTrack(`p1t${i}`, `P1 Track ${i}`, 70));
      const tracks2 = Array(20).fill(null).map((_, i) => createMockTrack(`p2t${i}`, `P2 Track ${i}`, 60));
      
      const config = createMockMixConfig(
        [
          { playlist: playlist1, tracks: tracks1 },
          { playlist: playlist2, tracks: tracks2 }
        ],
        {
          p1: { ratio: 2, isEnabled: true },
          p2: { ratio: 1, isEnabled: true }
        },
        30
      );

      const result = await mixerService.mixPlaylists(config);

      expect(result.tracks).toHaveLength(30);
      expect(result.metadata).toBeDefined();
      expect(result.statistics).toBeDefined();
    });

    it('should respect playlist ratios', async () => {
      const playlist1 = createMockPlaylist('p1', 'Playlist 1');
      const playlist2 = createMockPlaylist('p2', 'Playlist 2');
      
      const tracks1 = Array(50).fill(null).map((_, i) => createMockTrack(`p1t${i}`, `P1 Track ${i}`));
      const tracks2 = Array(50).fill(null).map((_, i) => createMockTrack(`p2t${i}`, `P2 Track ${i}`));
      
      const config = createMockMixConfig(
        [
          { playlist: playlist1, tracks: tracks1 },
          { playlist: playlist2, tracks: tracks2 }
        ],
        {
          p1: { ratio: 3, isEnabled: true }, // 75% of tracks
          p2: { ratio: 1, isEnabled: true }  // 25% of tracks
        },
        40
      );

      const result = await mixerService.mixPlaylists(config);

      // Count tracks from each playlist
      const p1Count = result.tracks.filter((t: any) => t.sourcePlaylist === 'p1').length;
      const p2Count = result.tracks.filter((t: any) => t.sourcePlaylist === 'p2').length;

      // Should be approximately 3:1 ratio (30:10 for 40 total tracks)
      expect(p1Count).toBeGreaterThan(p2Count * 2);
      expect(p1Count + p2Count).toBe(40);
    });

    it('should handle disabled playlists', async () => {
      const playlist1 = createMockPlaylist('p1', 'Playlist 1');
      const playlist2 = createMockPlaylist('p2', 'Playlist 2');
      
      const tracks1 = Array(20).fill(null).map((_, i) => createMockTrack(`p1t${i}`, `P1 Track ${i}`));
      const tracks2 = Array(20).fill(null).map((_, i) => createMockTrack(`p2t${i}`, `P2 Track ${i}`));
      
      const config = createMockMixConfig(
        [
          { playlist: playlist1, tracks: tracks1 },
          { playlist: playlist2, tracks: tracks2 }
        ],
        {
          p1: { ratio: 1, isEnabled: true },
          p2: { ratio: 1, isEnabled: false } // Disabled
        },
        20
      );

      const result = await mixerService.mixPlaylists(config);

      // All tracks should be from playlist 1
      const p1Count = result.tracks.filter((t: any) => t.sourcePlaylist === 'p1').length;
      const p2Count = result.tracks.filter((t: any) => t.sourcePlaylist === 'p2').length;

      expect(p1Count).toBe(20);
      expect(p2Count).toBe(0);
    });

    it('should throw validation error for invalid config', async () => {
      const config = createMockMixConfig([], {});

      await expect(mixerService.mixPlaylists(config)).rejects.toMatchObject({
        type: 'VALIDATION'
      });
    });

    it('should not include duplicate tracks', async () => {
      const playlist1 = createMockPlaylist('p1', 'Playlist 1');
      const tracks1 = Array(10).fill(null).map((_, i) => createMockTrack(`t${i}`, `Track ${i}`));
      
      const config = createMockMixConfig(
        [{ playlist: playlist1, tracks: tracks1 }],
        { p1: { ratio: 1, isEnabled: true } },
        20 // More than available tracks
      );

      const result = await mixerService.mixPlaylists(config);

      // Should only get unique tracks
      const trackIds = result.tracks.map(t => t.id);
      const uniqueTrackIds = [...new Set(trackIds)];
      
      expect(trackIds).toHaveLength(uniqueTrackIds.length);
      expect(result.tracks.length).toBeLessThanOrEqual(10);
    });
  });

  describe('previewMix', () => {
    it('should create a preview with limited tracks', async () => {
      const playlist1 = createMockPlaylist('p1', 'Playlist 1');
      const tracks1 = Array(50).fill(null).map((_, i) => createMockTrack(`t${i}`, `Track ${i}`));
      
      const config = createMockMixConfig(
        [{ playlist: playlist1, tracks: tracks1 }],
        { p1: { ratio: 1, isEnabled: true } },
        100 // Large number
      );

      const result = await mixerService.previewMix(config);

      expect(result.tracks.length).toBeLessThanOrEqual(20);
      expect(result.isPreview).toBe(true);
      expect(result.statistics).toBeDefined();
    });

    it('should respect smaller total songs in preview', async () => {
      const playlist1 = createMockPlaylist('p1', 'Playlist 1');
      const tracks1 = Array(50).fill(null).map((_, i) => createMockTrack(`t${i}`, `Track ${i}`));
      
      const config = createMockMixConfig(
        [{ playlist: playlist1, tracks: tracks1 }],
        { p1: { ratio: 1, isEnabled: true } },
        10 // Smaller than preview limit
      );

      const result = await mixerService.previewMix(config);

      expect(result.tracks.length).toBeLessThanOrEqual(10);
    });
  });

  describe('applyStrategy', () => {
    const mockTracks = [
      createMockTrack('t1', 'Track 1', 90),
      createMockTrack('t2', 'Track 2', 70),
      createMockTrack('t3', 'Track 3', 50),
      createMockTrack('t4', 'Track 4', 30)
    ];

    it('should apply balanced strategy (shuffle)', () => {
      const result = mixerService.applyStrategy(mockTracks, 'balanced');
      
      expect(result).toHaveLength(mockTracks.length);
      expect(result).toEqual(expect.arrayContaining(mockTracks));
    });

    it('should apply front-loaded strategy (high popularity first)', () => {
      const result = mixerService.applyStrategy(mockTracks, 'front-loaded');
      
      expect(result).toHaveLength(mockTracks.length);
      expect(result[0].popularity).toBeGreaterThanOrEqual(result[1].popularity);
      expect(result[1].popularity).toBeGreaterThanOrEqual(result[2].popularity);
    });

    it('should apply crescendo strategy (low to high popularity)', () => {
      const result = mixerService.applyStrategy(mockTracks, 'crescendo');
      
      expect(result).toHaveLength(mockTracks.length);
      expect(result[0].popularity).toBeLessThanOrEqual(result[1].popularity);
      expect(result[1].popularity).toBeLessThanOrEqual(result[2].popularity);
    });

    it('should apply random strategy (shuffle)', () => {
      const result = mixerService.applyStrategy(mockTracks, 'random');
      
      expect(result).toHaveLength(mockTracks.length);
      expect(result).toEqual(expect.arrayContaining(mockTracks));
    });

    it('should return copy of original array for unknown strategy', () => {
      const result = mixerService.applyStrategy(mockTracks, 'unknown' as MixStrategy);
      
      expect(result).toHaveLength(mockTracks.length);
      expect(result).not.toBe(mockTracks); // Should be a copy
      expect(result).toEqual(mockTracks);
    });
  });

  describe('calculateMixStatistics', () => {
    it('should calculate correct statistics', async () => {
      const tracks = [
        { ...createMockTrack('t1', 'Track 1', 80, 200000), sourcePlaylist: 'p1' },
        { ...createMockTrack('t2', 'Track 2', 60, 180000), sourcePlaylist: 'p1' },
        { ...createMockTrack('t3', 'Track 3', 40, 160000), sourcePlaylist: 'p2' }
      ] as any[];

      const config = createMockMixConfig(
        [],
        {
          p1: { ratio: 2, isEnabled: true },
          p2: { ratio: 1, isEnabled: true }
        }
      );

      const stats = await mixerService.calculateMixStatistics(tracks, config);

      expect(stats.totalTracks).toBe(3);
      expect(stats.playlistDistribution.p1).toBe(2);
      expect(stats.playlistDistribution.p2).toBe(1);
      expect(stats.averagePopularity).toBe(60); // (80 + 60 + 40) / 3
      expect(stats.totalDuration).toBe(9); // (200000 + 180000 + 160000) / 60000 minutes
    });

    it('should calculate ratio compliance', async () => {
      const tracks = [
        { ...createMockTrack('t1', 'Track 1'), sourcePlaylist: 'p1' },
        { ...createMockTrack('t2', 'Track 2'), sourcePlaylist: 'p1' },
        { ...createMockTrack('t3', 'Track 3'), sourcePlaylist: 'p2' }
      ] as any[];

      const config = createMockMixConfig(
        [],
        {
          p1: { ratio: 2, isEnabled: true }, // Expected 66.7%
          p2: { ratio: 1, isEnabled: true }  // Expected 33.3%
        }
      );

      const stats = await mixerService.calculateMixStatistics(tracks, config);

      // Actual: p1=66.7%, p2=33.3% - perfect compliance
      expect(stats.ratioCompliance).toBeCloseTo(1, 1);
    });

    it('should handle empty track list', async () => {
      const config = createMockMixConfig([], {});
      const stats = await mixerService.calculateMixStatistics([], config);

      expect(stats.totalTracks).toBe(0);
      expect(stats.averagePopularity).toBe(0);
      expect(stats.totalDuration).toBe(0);
      expect(stats.ratioCompliance).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should handle playlist with only one track', async () => {
      const playlist1 = createMockPlaylist('p1', 'Playlist 1');
      const tracks1 = [createMockTrack('t1', 'Only Track')];
      
      const config = createMockMixConfig(
        [{ playlist: playlist1, tracks: tracks1 }],
        { p1: { ratio: 1, isEnabled: true } },
        10
      );

      const result = await mixerService.mixPlaylists(config);

      expect(result.tracks).toHaveLength(1);
    });

    it('should handle tracks with missing popularity', async () => {
      const playlist1 = createMockPlaylist('p1', 'Playlist 1');
      const tracks1 = [
        { ...createMockTrack('t1', 'Track 1'), popularity: undefined } as any,
        createMockTrack('t2', 'Track 2', 50)
      ];
      
      const config = createMockMixConfig(
        [{ playlist: playlist1, tracks: tracks1 }],
        { p1: { ratio: 1, isEnabled: true } },
        2
      );

      const result = await mixerService.mixPlaylists(config);

      expect(result.tracks).toHaveLength(2);
      expect(result.statistics.averagePopularity).toBe(25); // (0 + 50) / 2
    });

    it('should handle tracks with missing duration', async () => {
      const playlist1 = createMockPlaylist('p1', 'Playlist 1');
      const tracks1 = [
        { ...createMockTrack('t1', 'Track 1'), duration_ms: undefined } as any,
        createMockTrack('t2', 'Track 2', 50, 180000)
      ];
      
      const config = createMockMixConfig(
        [{ playlist: playlist1, tracks: tracks1 }],
        { p1: { ratio: 1, isEnabled: true } },
        2
      );

      const result = await mixerService.mixPlaylists(config);

      expect(result.tracks).toHaveLength(2);
      expect(result.statistics.totalDuration).toBe(3); // 180000 / 60000 minutes
    });

    it('should handle very large playlists efficiently', async () => {
      const playlist1 = createMockPlaylist('p1', 'Large Playlist');
      const tracks1 = Array(10000).fill(null).map((_, i) => createMockTrack(`t${i}`, `Track ${i}`));
      
      const config = createMockMixConfig(
        [{ playlist: playlist1, tracks: tracks1 }],
        { p1: { ratio: 1, isEnabled: true } },
        100
      );

      const startTime = Date.now();
      const result = await mixerService.mixPlaylists(config);
      const endTime = Date.now();

      expect(result.tracks).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});