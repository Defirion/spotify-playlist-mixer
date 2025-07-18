import React, { ReactNode } from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePlaylistMixer } from '../usePlaylistMixer';
import { MixerProvider } from '../../context/MixerContext';
import { IPlaylistMixerService, ISpotifyService } from '../../types/services';
import { 
  MixConfig, 
  MixResult, 
  MixPreview, 
  Track, 
  Playlist, 
  User, 
  SelectedPlaylist,
  MixOptions,
  MixStrategy,
  PlaylistRatioConfig 
} from '../../types';

// Mock services
const createMockPlaylistMixerService = (): jest.Mocked<IPlaylistMixerService> => ({
  mixPlaylists: jest.fn(),
  previewMix: jest.fn(),
  validateMixConfig: jest.fn(),
  applyStrategy: jest.fn(),
  calculateMixStatistics: jest.fn(),
});

const createMockSpotifyService = (): jest.Mocked<ISpotifyService> => ({
  authenticate: jest.fn(),
  getUserProfile: jest.fn(),
  getUserPlaylists: jest.fn(),
  getPlaylistTracks: jest.fn(),
  createPlaylist: jest.fn(),
  addTracksToPlaylist: jest.fn(),
  searchTracks: jest.fn(),
  getTrack: jest.fn(),
  getMultipleTracks: jest.fn(),
});

// Mock data
const mockUser: User = {
  id: 'user123',
  displayName: 'Test User',
  email: 'test@example.com',
};

const mockTracks: Track[] = [
  {
    id: 'track1',
    name: 'Test Track 1',
    artists: [{ id: 'artist1', name: 'Test Artist 1', uri: 'spotify:artist:artist1' }],
    album: { 
      id: 'album1', 
      name: 'Test Album 1', 
      images: [],
      artists: [{ id: 'artist1', name: 'Test Artist 1', uri: 'spotify:artist:artist1' }],
      release_date: '2023-01-01'
    },
    duration_ms: 180000,
    popularity: 80,
    uri: 'spotify:track:track1',
    preview_url: 'https://example.com/preview1.mp3',
  },
  {
    id: 'track2',
    name: 'Test Track 2',
    artists: [{ id: 'artist2', name: 'Test Artist 2', uri: 'spotify:artist:artist2' }],
    album: { 
      id: 'album2', 
      name: 'Test Album 2', 
      images: [],
      artists: [{ id: 'artist2', name: 'Test Artist 2', uri: 'spotify:artist:artist2' }],
      release_date: '2023-01-01'
    },
    duration_ms: 200000,
    popularity: 75,
    uri: 'spotify:track:track2',
    preview_url: 'https://example.com/preview2.mp3',
  },
];

const mockPlaylist: Playlist = {
  id: 'playlist1',
  name: 'Test Playlist',
  description: 'Test playlist description',
  trackCount: 2,
  owner: mockUser,
  images: [],
  tracks: mockTracks,
};

const mockSelectedPlaylist: SelectedPlaylist = {
  playlist: mockPlaylist,
  tracks: mockTracks,
  config: { ratio: 1, isEnabled: true },
};

const mockMixOptions: MixOptions = {
  strategy: 'balanced' as MixStrategy,
  shuffleWithinRatio: true,
  avoidConsecutiveSamePlaylist: true,
  totalSongs: 100,
};

const mockMixConfig: MixConfig = {
  playlists: [mockSelectedPlaylist],
  ratioConfig: { 'playlist1': { ratio: 1, isEnabled: true } },
  mixOptions: mockMixOptions,
};

const mockMixResult: MixResult = {
  tracks: mockTracks,
  metadata: {
    generatedAt: new Date(),
    strategy: 'balanced' as MixStrategy,
    sourcePlaylistCount: 1,
    configHash: 'test-hash',
  },
  statistics: {
    totalTracks: 2,
    playlistDistribution: { 'playlist1': 2 },
    ratioCompliance: 0.95,
    averagePopularity: 77.5,
    totalDuration: 380000,
  },
};

const mockMixPreview: MixPreview = {
  tracks: mockTracks.slice(0, 1),
  statistics: {
    totalTracks: 1,
    playlistDistribution: { 'playlist1': 1 },
    ratioCompliance: 1.0,
    averagePopularity: 80,
    totalDuration: 180000,
  },
  isPreview: true,
};

// Test wrapper component
const createWrapper = (
  playlistMixerService: IPlaylistMixerService,
  spotifyService: ISpotifyService
) => {
  return ({ children }: { children: ReactNode }) => (
    <MixerProvider 
      playlistMixerService={playlistMixerService}
      spotifyService={spotifyService}
    >
      {children}
    </MixerProvider>
  );
};

describe('usePlaylistMixer', () => {
  let mockPlaylistMixerService: jest.Mocked<IPlaylistMixerService>;
  let mockSpotifyService: jest.Mocked<ISpotifyService>;

  beforeEach(() => {
    mockPlaylistMixerService = createMockPlaylistMixerService();
    mockSpotifyService = createMockSpotifyService();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Basic functionality', () => {
    it('should return initial state', () => {
      const wrapper = createWrapper(mockPlaylistMixerService, mockSpotifyService);
      const { result } = renderHook(() => usePlaylistMixer(), { wrapper });

      expect(result.current).not.toBeNull();
      expect(result.current.currentMix).toBeNull();
      expect(result.current.previewMix).toBeNull();
      expect(result.current.isGenerating).toBe(false);
      expect(result.current.mixHistory).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(result.current.backgroundStatus.isProcessing).toBe(false);
    });
  });

  describe('Mix generation', () => {
    beforeEach(() => {
      mockPlaylistMixerService.validateMixConfig.mockResolvedValue({
        isValid: true,
        errors: [],
      });
      mockPlaylistMixerService.mixPlaylists.mockResolvedValue(mockMixResult);
    });

    it('should generate mix successfully', async () => {
      const wrapper = createWrapper(mockPlaylistMixerService, mockSpotifyService);
      const { result } = renderHook(() => usePlaylistMixer(), { wrapper });

      let mixResult: MixResult | undefined;
      await act(async () => {
        mixResult = await result.current.generateMix(mockMixConfig);
      });

      expect(mockPlaylistMixerService.mixPlaylists).toHaveBeenCalledWith(mockMixConfig);
      expect(mixResult).toEqual(mockMixResult);
      expect(result.current.currentMix).toEqual(mockMixResult);
    });

    it('should generate mix with background processing', async () => {
      const wrapper = createWrapper(mockPlaylistMixerService, mockSpotifyService);
      const { result } = renderHook(() => usePlaylistMixer(), { wrapper });

      let mixResult: MixResult | undefined;
      const generatePromise = act(async () => {
        mixResult = await result.current.generateMix(mockMixConfig, { background: true });
      });

      // Check that background processing started
      expect(result.current.backgroundStatus.isProcessing).toBe(true);

      // Advance timers to simulate progress
      act(() => {
        jest.advanceTimersByTime(2500); // Advance through all progress steps
      });

      await generatePromise;

      expect(mixResult).toEqual(mockMixResult);
      expect(result.current.backgroundStatus.isProcessing).toBe(false);
      expect(result.current.backgroundStatus.progress).toBe(100);
    });

    it('should handle mix generation failure', async () => {
      const error = new Error('Mix generation failed');
      mockPlaylistMixerService.mixPlaylists.mockRejectedValue(error);

      const wrapper = createWrapper(mockPlaylistMixerService, mockSpotifyService);
      const { result } = renderHook(() => usePlaylistMixer(), { wrapper });

      await act(async () => {
        try {
          await result.current.generateMix(mockMixConfig);
        } catch (e) {
          expect(e).toBe(error);
        }
      });

      expect(result.current.error).toBe('Mix generation failed');
    });

    it('should use cached mix when available', async () => {
      const wrapper = createWrapper(mockPlaylistMixerService, mockSpotifyService);
      const { result } = renderHook(() => usePlaylistMixer(), { wrapper });

      // First generation
      await act(async () => {
        await result.current.generateMix(mockMixConfig);
      });

      // Clear the mock to verify cache usage
      mockPlaylistMixerService.mixPlaylists.mockClear();

      // Second generation should use cache
      let cachedResult: MixResult | undefined;
      await act(async () => {
        cachedResult = await result.current.generateMix(mockMixConfig);
      });

      expect(mockPlaylistMixerService.mixPlaylists).not.toHaveBeenCalled();
      expect(cachedResult).toEqual(mockMixResult);
    });
  });

  describe('Preview generation', () => {
    beforeEach(() => {
      mockPlaylistMixerService.validateMixConfig.mockResolvedValue({
        isValid: true,
        errors: [],
      });
      mockPlaylistMixerService.previewMix.mockResolvedValue(mockMixPreview);
    });

    it('should generate preview successfully', async () => {
      const wrapper = createWrapper(mockPlaylistMixerService, mockSpotifyService);
      const { result } = renderHook(() => usePlaylistMixer(), { wrapper });

      let previewResult: MixPreview | undefined;
      await act(async () => {
        previewResult = await result.current.generatePreview(mockMixConfig);
      });

      expect(mockPlaylistMixerService.previewMix).toHaveBeenCalledWith(mockMixConfig);
      expect(previewResult).toEqual(mockMixPreview);
      expect(result.current.previewMix).toEqual(mockMixPreview);
    });
  });

  describe('Mix validation', () => {
    it('should validate mix config with enhanced feedback', async () => {
      mockPlaylistMixerService.validateMixConfig.mockResolvedValue({
        isValid: true,
        errors: [],
      });

      const wrapper = createWrapper(mockPlaylistMixerService, mockSpotifyService);
      const { result } = renderHook(() => usePlaylistMixer(), { wrapper });

      let validation: any;
      await act(async () => {
        validation = await result.current.validateMixConfig(mockMixConfig);
      });

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toEqual([]);
      expect(validation.warnings).toBeDefined();
      expect(validation.suggestions).toBeDefined();
    });

    it('should provide warnings for single playlist', async () => {
      mockPlaylistMixerService.validateMixConfig.mockResolvedValue({
        isValid: true,
        errors: [],
      });

      const singlePlaylistConfig = {
        ...mockMixConfig,
        playlists: [mockSelectedPlaylist],
      };

      const wrapper = createWrapper(mockPlaylistMixerService, mockSpotifyService);
      const { result } = renderHook(() => usePlaylistMixer(), { wrapper });

      let validation: any;
      await act(async () => {
        validation = await result.current.validateMixConfig(singlePlaylistConfig);
      });

      expect(validation.warnings).toContain(
        'Consider using at least 2 playlists for better mixing results'
      );
    });
  });

  describe('Mix operations', () => {
    beforeEach(() => {
      mockPlaylistMixerService.validateMixConfig.mockResolvedValue({
        isValid: true,
        errors: [],
      });
      mockPlaylistMixerService.mixPlaylists.mockResolvedValue(mockMixResult);
    });

    it('should regenerate mix with different strategy', async () => {
      const wrapper = createWrapper(mockPlaylistMixerService, mockSpotifyService);
      const { result } = renderHook(() => usePlaylistMixer(), { wrapper });

      // First generate a mix to set the last config
      await act(async () => {
        await result.current.generateMix(mockMixConfig);
      });

      // Clear the mock
      mockPlaylistMixerService.mixPlaylists.mockClear();

      // Regenerate with different strategy
      await act(async () => {
        await result.current.regenerateMix('random' as MixStrategy);
      });

      expect(mockPlaylistMixerService.mixPlaylists).toHaveBeenCalledWith({
        ...mockMixConfig,
        mixOptions: {
          ...mockMixConfig.mixOptions,
          strategy: 'random',
        },
      });
    });

    it('should apply strategy to existing mix', async () => {
      const wrapper = createWrapper(mockPlaylistMixerService, mockSpotifyService);
      const { result } = renderHook(() => usePlaylistMixer(), { wrapper });

      // First generate a mix to set the last config
      await act(async () => {
        await result.current.generateMix(mockMixConfig);
      });

      // Clear the mock
      mockPlaylistMixerService.mixPlaylists.mockClear();

      // Apply new strategy
      await act(async () => {
        await result.current.applyMixStrategy(mockMixResult, 'crescendo' as MixStrategy);
      });

      expect(mockPlaylistMixerService.mixPlaylists).toHaveBeenCalledWith({
        ...mockMixConfig,
        mixOptions: {
          ...mockMixConfig.mixOptions,
          strategy: 'crescendo',
        },
      });
    });
  });

  describe('Mix statistics', () => {
    it('should calculate mix statistics correctly', () => {
      const wrapper = createWrapper(mockPlaylistMixerService, mockSpotifyService);
      const { result } = renderHook(() => usePlaylistMixer(), { wrapper });

      const stats = result.current.getMixStatistics(mockMixResult);

      expect(stats.totalTracks).toBe(2);
      expect(stats.totalDuration).toBe(380000);
      expect(stats.averagePopularity).toBe(77.5);
      expect(stats.artistDistribution).toEqual({
        'Test Artist 1': 1,
        'Test Artist 2': 1,
      });
      expect(stats.duplicateCount).toBe(0);
    });
  });

  describe('Mix comparison', () => {
    it('should compare two mixes correctly', () => {
      const wrapper = createWrapper(mockPlaylistMixerService, mockSpotifyService);
      const { result } = renderHook(() => usePlaylistMixer(), { wrapper });

      const mix2: MixResult = {
        ...mockMixResult,
        tracks: [mockTracks[0]], // Only first track
      };

      const comparison = result.current.compareMixes(mockMixResult, mix2);

      expect(comparison.similarity).toBe(0.5); // 1 common track out of 2 total
      expect(comparison.commonTracks).toHaveLength(1);
      expect(comparison.uniqueToFirst).toHaveLength(1);
      expect(comparison.uniqueToSecond).toHaveLength(0);
    });
  });

  describe('Caching', () => {
    beforeEach(() => {
      mockPlaylistMixerService.validateMixConfig.mockResolvedValue({
        isValid: true,
        errors: [],
      });
      mockPlaylistMixerService.mixPlaylists.mockResolvedValue(mockMixResult);
    });

    it('should provide cache statistics', async () => {
      const wrapper = createWrapper(mockPlaylistMixerService, mockSpotifyService);
      const { result } = renderHook(() => usePlaylistMixer(), { wrapper });

      // Initial stats
      let stats = result.current.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.hitRate).toBe(0);

      // Generate mix to populate cache
      await act(async () => {
        await result.current.generateMix(mockMixConfig);
      });

      // Generate again to get cache hit
      await act(async () => {
        await result.current.generateMix(mockMixConfig);
      });

      stats = result.current.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.hitRate).toBeGreaterThan(0);
    });

    it('should clear cache', async () => {
      const wrapper = createWrapper(mockPlaylistMixerService, mockSpotifyService);
      const { result } = renderHook(() => usePlaylistMixer(), { wrapper });

      // Populate cache
      await act(async () => {
        await result.current.generateMix(mockMixConfig);
      });

      let stats = result.current.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);

      // Clear cache
      act(() => {
        result.current.clearMixCache();
      });

      stats = result.current.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.hitRate).toBe(0);
    });
  });

  describe('Background processing control', () => {
    beforeEach(() => {
      mockPlaylistMixerService.validateMixConfig.mockResolvedValue({
        isValid: true,
        errors: [],
      });
      mockPlaylistMixerService.mixPlaylists.mockResolvedValue(mockMixResult);
    });

    it('should cancel background processing', async () => {
      const wrapper = createWrapper(mockPlaylistMixerService, mockSpotifyService);
      const { result } = renderHook(() => usePlaylistMixer(), { wrapper });

      // Start background processing
      const generatePromise = act(async () => {
        try {
          await result.current.generateMix(mockMixConfig, { background: true });
        } catch (error) {
          // Expected to be cancelled
        }
      });

      // Cancel processing
      act(() => {
        result.current.cancelBackgroundProcessing();
      });

      expect(result.current.backgroundStatus.isProcessing).toBe(false);
      expect(result.current.backgroundStatus.progress).toBe(0);
    });

    it('should pause and resume background processing', () => {
      const wrapper = createWrapper(mockPlaylistMixerService, mockSpotifyService);
      const { result } = renderHook(() => usePlaylistMixer(), { wrapper });

      act(() => {
        result.current.pauseBackgroundProcessing();
      });

      expect(result.current.backgroundStatus.currentStep).toBe('Paused');

      act(() => {
        result.current.resumeBackgroundProcessing();
      });

      expect(result.current.backgroundStatus.currentStep).toBe('Resuming...');
    });
  });

  describe('Mix export', () => {
    beforeEach(() => {
      mockSpotifyService.createPlaylist.mockResolvedValue({
        id: 'new-playlist-id',
        name: 'Exported Mix',
        description: 'Exported mix playlist',
        trackCount: 2,
        owner: mockUser,
        images: [],
        tracks: [],
      });
      mockSpotifyService.addTracksToPlaylist.mockResolvedValue();
    });

    it('should export mix as playlist', async () => {
      const wrapper = createWrapper(mockPlaylistMixerService, mockSpotifyService);
      const { result } = renderHook(() => usePlaylistMixer(), { wrapper });

      let playlistId: string | undefined;
      await act(async () => {
        playlistId = await result.current.exportMixAsPlaylist(mockMixResult, 'My Mix');
      });

      expect(mockSpotifyService.createPlaylist).toHaveBeenCalledWith(
        'My Mix',
        expect.stringContaining('Mixed playlist created on')
      );
      expect(mockSpotifyService.addTracksToPlaylist).toHaveBeenCalledWith(
        'new-playlist-id',
        ['spotify:track:track1', 'spotify:track:track2']
      );
      expect(playlistId).toBe('new-playlist-id');
    });
  });

  describe('State management', () => {
    it('should clear current mix', async () => {
      mockPlaylistMixerService.validateMixConfig.mockResolvedValue({
        isValid: true,
        errors: [],
      });
      mockPlaylistMixerService.mixPlaylists.mockResolvedValue(mockMixResult);

      const wrapper = createWrapper(mockPlaylistMixerService, mockSpotifyService);
      const { result } = renderHook(() => usePlaylistMixer(), { wrapper });

      // Generate mix
      await act(async () => {
        await result.current.generateMix(mockMixConfig);
      });

      expect(result.current.currentMix).toEqual(mockMixResult);

      // Clear mix
      act(() => {
        result.current.clearCurrentMix();
      });

      expect(result.current.currentMix).toBeNull();
    });

    it('should clear errors', async () => {
      const error = new Error('Test error');
      mockPlaylistMixerService.validateMixConfig.mockResolvedValue({
        isValid: true,
        errors: [],
      });
      mockPlaylistMixerService.mixPlaylists.mockRejectedValue(error);

      const wrapper = createWrapper(mockPlaylistMixerService, mockSpotifyService);
      const { result } = renderHook(() => usePlaylistMixer(), { wrapper });

      // Trigger error
      await act(async () => {
        try {
          await result.current.generateMix(mockMixConfig);
        } catch (e) {
          // Expected error
        }
      });

      expect(result.current.error).toBe('Test error');

      // Clear error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});