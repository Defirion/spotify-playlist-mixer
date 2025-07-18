import React, { ReactNode } from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePlaylistManager } from '../usePlaylistManager';
import { PlaylistProvider } from '../../context/PlaylistContext';
import { ISpotifyService } from '../../types/services';
import { Playlist, Track, User, PlaylistRatioConfig } from '../../types';

// Mock Spotify service
const createMockSpotifyService = (): jest.Mocked<ISpotifyService> => ({
  getUserPlaylists: jest.fn(),
  getPlaylistTracks: jest.fn(),
  searchTracks: jest.fn(),
  createPlaylist: jest.fn(),
  addTracksToPlaylist: jest.fn(),
  removeTracksFromPlaylist: jest.fn(),
  getCurrentUser: jest.fn(),
  getTrack: jest.fn(),
  getAudioFeatures: jest.fn(),
});

// Mock data
const mockUser: User = {
  id: 'user123',
  displayName: 'Test User',
  email: 'test@example.com',
};

const mockPlaylists: Playlist[] = [
  {
    id: 'playlist1',
    name: 'Rock Classics',
    description: 'Best rock songs',
    trackCount: 50,
    owner: mockUser,
    images: [],
    tracks: [],
  },
  {
    id: 'playlist2',
    name: 'Jazz Favorites',
    description: 'Smooth jazz collection',
    trackCount: 30,
    owner: mockUser,
    images: [],
    tracks: [],
  },
  {
    id: 'playlist3',
    name: 'Pop Hits',
    description: 'Latest pop songs',
    trackCount: 75,
    owner: { ...mockUser, displayName: 'Another User' },
    images: [],
    tracks: [],
  },
];

const mockTracks: Track[] = [
  {
    id: 'track1',
    name: 'Test Track 1',
    artists: [{ id: 'artist1', name: 'Test Artist 1' }],
    album: { id: 'album1', name: 'Test Album 1', images: [] },
    duration_ms: 180000,
    popularity: 80,
    uri: 'spotify:track:track1',
    preview_url: 'https://example.com/preview1.mp3',
  },
  {
    id: 'track2',
    name: 'Test Track 2',
    artists: [{ id: 'artist2', name: 'Test Artist 2' }],
    album: { id: 'album2', name: 'Test Album 2', images: [] },
    duration_ms: 200000,
    popularity: 75,
    uri: 'spotify:track:track2',
    preview_url: 'https://example.com/preview2.mp3',
  },
];

// Test wrapper component
const createWrapper = (spotifyService: ISpotifyService) => {
  return ({ children }: { children: ReactNode }) => (
    <PlaylistProvider spotifyService={spotifyService}>
      {children}
    </PlaylistProvider>
  );
};

describe('usePlaylistManager', () => {
  let mockSpotifyService: jest.Mocked<ISpotifyService>;

  beforeEach(() => {
    mockSpotifyService = createMockSpotifyService();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Basic functionality', () => {
    it('should return initial state', () => {
      const wrapper = createWrapper(mockSpotifyService);
      const { result } = renderHook(() => usePlaylistManager(), { wrapper });

      expect(result.current.playlists).toEqual([]);
      expect(result.current.selectedPlaylists).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.searchQuery).toBe('');
    });
  });

  describe('Playlist fetching', () => {
    it('should fetch playlists successfully', async () => {
      mockSpotifyService.getUserPlaylists.mockResolvedValue(mockPlaylists);

      const wrapper = createWrapper(mockSpotifyService);
      const { result } = renderHook(() => usePlaylistManager(), { wrapper });

      await act(async () => {
        await result.current.fetchPlaylists();
      });

      expect(mockSpotifyService.getUserPlaylists).toHaveBeenCalled();
      expect(result.current.playlists).toEqual(mockPlaylists);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle playlist fetching failure', async () => {
      const error = new Error('Failed to fetch playlists');
      mockSpotifyService.getUserPlaylists.mockRejectedValue(error);

      const wrapper = createWrapper(mockSpotifyService);
      const { result } = renderHook(() => usePlaylistManager(), { wrapper });

      await act(async () => {
        try {
          await result.current.fetchPlaylists();
        } catch (e) {
          expect(e).toBe(error);
        }
      });

      expect(result.current.error).toBe('Failed to fetch playlists');
    });

    it('should use cached playlists when available', async () => {
      mockSpotifyService.getUserPlaylists.mockResolvedValue(mockPlaylists);

      const wrapper = createWrapper(mockSpotifyService);
      const { result } = renderHook(() => usePlaylistManager(), { wrapper });

      // First fetch
      await act(async () => {
        await result.current.fetchPlaylists();
      });

      expect(mockSpotifyService.getUserPlaylists).toHaveBeenCalledTimes(1);
      expect(result.current.playlists).toEqual(mockPlaylists);

      // The cache logic triggers background refresh, so we expect the service to be called
      // but the UI should show cached data immediately
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Track fetching', () => {
    it('should fetch playlist tracks successfully', async () => {
      mockSpotifyService.getPlaylistTracks.mockResolvedValue(mockTracks);

      const wrapper = createWrapper(mockSpotifyService);
      const { result } = renderHook(() => usePlaylistManager(), { wrapper });

      let tracks: Track[] = [];
      await act(async () => {
        tracks = await result.current.getPlaylistTracks('playlist1');
      });

      expect(mockSpotifyService.getPlaylistTracks).toHaveBeenCalledWith('playlist1');
      expect(tracks).toEqual(mockTracks);
    });

    it('should cache playlist tracks', async () => {
      mockSpotifyService.getPlaylistTracks.mockResolvedValue(mockTracks);

      const wrapper = createWrapper(mockSpotifyService);
      const { result } = renderHook(() => usePlaylistManager(), { wrapper });

      // First fetch
      await act(async () => {
        await result.current.getPlaylistTracks('playlist1');
      });

      // Clear the mock
      mockSpotifyService.getPlaylistTracks.mockClear();

      // Second fetch should use cache
      let cachedTracks: Track[] = [];
      await act(async () => {
        cachedTracks = await result.current.getPlaylistTracks('playlist1');
      });

      expect(mockSpotifyService.getPlaylistTracks).not.toHaveBeenCalled();
      expect(cachedTracks).toEqual(mockTracks);
    });
  });

  describe('Playlist selection', () => {
    beforeEach(async () => {
      mockSpotifyService.getUserPlaylists.mockResolvedValue(mockPlaylists);
      mockSpotifyService.getPlaylistTracks.mockResolvedValue(mockTracks);
    });

    it('should select playlist successfully', async () => {
      const wrapper = createWrapper(mockSpotifyService);
      const { result } = renderHook(() => usePlaylistManager(), { wrapper });

      const config: PlaylistRatioConfig = { ratio: 2, isEnabled: true };

      await act(async () => {
        await result.current.selectPlaylist(mockPlaylists[0], config);
      });

      expect(result.current.selectedPlaylists).toHaveLength(1);
      expect(result.current.selectedPlaylists[0].playlist.id).toBe(mockPlaylists[0].id);
      expect(result.current.selectedPlaylists[0].playlist.name).toBe(mockPlaylists[0].name);
      expect(result.current.selectedPlaylists[0].tracks).toEqual(mockTracks);
      expect(result.current.selectedPlaylists[0].config).toEqual(config);
      expect(result.current.isPlaylistSelected(mockPlaylists[0].id)).toBe(true);
    });

    it('should deselect playlist', async () => {
      const wrapper = createWrapper(mockSpotifyService);
      const { result } = renderHook(() => usePlaylistManager(), { wrapper });

      // First select a playlist
      await act(async () => {
        await result.current.selectPlaylist(mockPlaylists[0]);
      });

      expect(result.current.selectedPlaylists).toHaveLength(1);

      // Then deselect it
      act(() => {
        result.current.deselectPlaylist(mockPlaylists[0].id);
      });

      expect(result.current.selectedPlaylists).toHaveLength(0);
      expect(result.current.isPlaylistSelected(mockPlaylists[0].id)).toBe(false);
    });

    it('should update playlist configuration', async () => {
      const wrapper = createWrapper(mockSpotifyService);
      const { result } = renderHook(() => usePlaylistManager(), { wrapper });

      // Select a playlist
      await act(async () => {
        await result.current.selectPlaylist(mockPlaylists[0], { ratio: 1, isEnabled: true });
      });

      const newConfig: PlaylistRatioConfig = { ratio: 3, isEnabled: false };

      // Update configuration
      act(() => {
        result.current.updatePlaylistConfig(mockPlaylists[0].id, newConfig);
      });

      const selectedPlaylist = result.current.getSelectedPlaylist(mockPlaylists[0].id);
      expect(selectedPlaylist?.config).toEqual(newConfig);
    });

    it('should clear all selected playlists', async () => {
      const wrapper = createWrapper(mockSpotifyService);
      const { result } = renderHook(() => usePlaylistManager(), { wrapper });

      // Select multiple playlists
      await act(async () => {
        await result.current.selectPlaylist(mockPlaylists[0]);
        await result.current.selectPlaylist(mockPlaylists[1]);
      });

      expect(result.current.selectedPlaylists).toHaveLength(2);

      // Clear all selections
      act(() => {
        result.current.clearSelectedPlaylists();
      });

      expect(result.current.selectedPlaylists).toHaveLength(0);
    });
  });

  describe('Search and filtering', () => {
    beforeEach(async () => {
      mockSpotifyService.getUserPlaylists.mockResolvedValue(mockPlaylists);
    });

    it('should filter playlists by search query', async () => {
      const wrapper = createWrapper(mockSpotifyService);
      const { result } = renderHook(() => usePlaylistManager(), { wrapper });

      // Fetch playlists first
      await act(async () => {
        await result.current.fetchPlaylists();
      });

      // Set search query
      act(() => {
        result.current.setSearchQuery('rock');
      });

      // Wait for debounce
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.filteredPlaylists).toHaveLength(1);
        expect(result.current.filteredPlaylists[0].name).toBe('Rock Classics');
      });
    });

    it('should filter playlists by track count', () => {
      const wrapper = createWrapper(mockSpotifyService);
      const { result } = renderHook(() => usePlaylistManager(), { wrapper });

      const filtered = result.current.filterPlaylists(mockPlaylists, {
        minTracks: 40,
        maxTracks: 60,
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Rock Classics');
    });

    it('should filter playlists by owner', () => {
      const wrapper = createWrapper(mockSpotifyService);
      const { result } = renderHook(() => usePlaylistManager(), { wrapper });

      const filtered = result.current.filterPlaylists(mockPlaylists, {
        owner: 'Another User',
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Pop Hits');
    });

    it('should sort playlists by name', () => {
      const wrapper = createWrapper(mockSpotifyService);
      const { result } = renderHook(() => usePlaylistManager(), { wrapper });

      const sorted = result.current.filterPlaylists(mockPlaylists, {
        sortBy: 'name',
        sortOrder: 'asc',
      });

      expect(sorted[0].name).toBe('Jazz Favorites');
      expect(sorted[1].name).toBe('Pop Hits');
      expect(sorted[2].name).toBe('Rock Classics');
    });

    it('should sort playlists by track count descending', () => {
      const wrapper = createWrapper(mockSpotifyService);
      const { result } = renderHook(() => usePlaylistManager(), { wrapper });

      const sorted = result.current.filterPlaylists(mockPlaylists, {
        sortBy: 'trackCount',
        sortOrder: 'desc',
      });

      expect(sorted[0].trackCount).toBe(75);
      expect(sorted[1].trackCount).toBe(50);
      expect(sorted[2].trackCount).toBe(30);
    });

    it('should search playlists with caching', async () => {
      const wrapper = createWrapper(mockSpotifyService);
      const { result } = renderHook(() => usePlaylistManager(), { wrapper });

      // Fetch playlists first
      await act(async () => {
        await result.current.fetchPlaylists();
      });

      const searchOptions = { query: 'jazz', sortBy: 'name' as const };

      // First search
      let results1: Playlist[] = [];
      act(() => {
        results1 = result.current.searchPlaylists(searchOptions);
      });

      // Second search with same options should use cache
      let results2: Playlist[] = [];
      act(() => {
        results2 = result.current.searchPlaylists(searchOptions);
      });

      expect(results1).toEqual(results2);
      expect(results1).toHaveLength(1);
      expect(results1[0].name).toBe('Jazz Favorites');
    });
  });

  describe('Cache management', () => {
    it('should provide cache statistics', async () => {
      mockSpotifyService.getPlaylistTracks.mockResolvedValue(mockTracks);

      const wrapper = createWrapper(mockSpotifyService);
      const { result } = renderHook(() => usePlaylistManager(), { wrapper });

      // Initial stats
      let stats = result.current.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.hitRate).toBe(0);

      // Fetch tracks to populate cache
      await act(async () => {
        await result.current.getPlaylistTracks('playlist1');
      });

      // Fetch again to get cache hit
      await act(async () => {
        await result.current.getPlaylistTracks('playlist1');
      });

      stats = result.current.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.hitRate).toBeGreaterThan(0);
    });

    it('should clear cache', async () => {
      mockSpotifyService.getPlaylistTracks.mockResolvedValue(mockTracks);

      const wrapper = createWrapper(mockSpotifyService);
      const { result } = renderHook(() => usePlaylistManager(), { wrapper });

      // Populate cache
      await act(async () => {
        await result.current.getPlaylistTracks('playlist1');
      });

      let stats = result.current.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);

      // Clear cache
      act(() => {
        result.current.clearCache();
      });

      stats = result.current.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.hitRate).toBe(0);
    });
  });

  describe('Debounced search', () => {
    it('should debounce search query updates', async () => {
      mockSpotifyService.getUserPlaylists.mockResolvedValue(mockPlaylists);

      const wrapper = createWrapper(mockSpotifyService);
      const { result } = renderHook(() => usePlaylistManager(), { wrapper });

      // Fetch playlists first
      await act(async () => {
        await result.current.fetchPlaylists();
      });

      // Rapidly change search query
      act(() => {
        result.current.setSearchQuery('r');
      });
      act(() => {
        result.current.setSearchQuery('ro');
      });
      act(() => {
        result.current.setSearchQuery('roc');
      });
      act(() => {
        result.current.setSearchQuery('rock');
      });

      // Should still show all playlists before debounce
      expect(result.current.filteredPlaylists).toHaveLength(3);

      // Advance timers to trigger debounce
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.filteredPlaylists).toHaveLength(1);
        expect(result.current.filteredPlaylists[0].name).toBe('Rock Classics');
      });
    });
  });

  describe('Error handling', () => {
    it('should clear errors', async () => {
      const error = new Error('Test error');
      mockSpotifyService.getUserPlaylists.mockRejectedValue(error);

      const wrapper = createWrapper(mockSpotifyService);
      const { result } = renderHook(() => usePlaylistManager(), { wrapper });

      // Trigger error
      await act(async () => {
        try {
          await result.current.fetchPlaylists();
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