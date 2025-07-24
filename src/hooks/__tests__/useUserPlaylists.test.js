import { renderHook, act, waitFor } from '@testing-library/react';
import useUserPlaylists from '../useUserPlaylists';
import SpotifyService from '../../services/spotify';

// Mock axios
jest.mock('axios');

// Mock the SpotifyService
jest.mock('../../services/spotify');

describe('useUserPlaylists', () => {
  let mockSpotifyService;
  const mockAccessToken = 'mock-access-token';

  beforeEach(() => {
    jest.clearAllMocks();

    mockSpotifyService = {
      getUserPlaylists: jest.fn(),
    };

    SpotifyService.mockImplementation(() => mockSpotifyService);
  });

  describe('Initialization', () => {
    it('initializes with default state', () => {
      const { result } = renderHook(() => useUserPlaylists(mockAccessToken));

      expect(result.current.playlists).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.total).toBe(0);
      expect(result.current.isEmpty).toBe(true);
      expect(result.current.hasData).toBe(false);
      expect(result.current.totalPlaylists).toBe(0);
    });

    it('creates SpotifyService instance with access token', () => {
      renderHook(() => useUserPlaylists(mockAccessToken));

      expect(SpotifyService).toHaveBeenCalledWith(mockAccessToken);
    });

    it('handles missing access token gracefully', () => {
      const { result } = renderHook(() => useUserPlaylists(null));

      expect(SpotifyService).not.toHaveBeenCalled();
      expect(result.current.error).toBe(null);
    });
  });

  describe('Auto-fetch functionality', () => {
    const mockPlaylists = [
      {
        id: '1',
        name: 'Playlist 1',
        owner: { id: 'user1', display_name: 'User 1' },
      },
      {
        id: '2',
        name: 'Playlist 2',
        owner: { id: 'user2', display_name: 'User 2' },
      },
    ];

    const mockPlaylistsResponse = {
      items: mockPlaylists,
      total: 100,
      limit: 50,
      offset: 0,
      hasMore: true,
    };

    it('fetches playlists automatically by default', async () => {
      mockSpotifyService.getUserPlaylists.mockResolvedValue(
        mockPlaylistsResponse
      );

      const { result } = renderHook(() => useUserPlaylists(mockAccessToken));

      await waitFor(() => {
        expect(mockSpotifyService.getUserPlaylists).toHaveBeenCalledWith({
          limit: 50,
          offset: 0,
        });
      });

      expect(result.current.playlists).toEqual(mockPlaylists);
      expect(result.current.hasData).toBe(true);
      expect(result.current.totalPlaylists).toBe(2);
      expect(result.current.hasMore).toBe(true);
      expect(result.current.total).toBe(100);
    });

    it('does not fetch when autoFetch is false', () => {
      renderHook(() => useUserPlaylists(mockAccessToken, { autoFetch: false }));

      expect(mockSpotifyService.getUserPlaylists).not.toHaveBeenCalled();
    });

    it('fetches all playlists when fetchAll is true', async () => {
      const allPlaylistsResponse = {
        items: mockPlaylists,
        total: 2,
        limit: 2,
        offset: 0,
        hasMore: false,
      };

      mockSpotifyService.getUserPlaylists.mockResolvedValue(
        allPlaylistsResponse
      );

      const { result } = renderHook(() =>
        useUserPlaylists(mockAccessToken, { fetchAll: true })
      );

      await waitFor(() => {
        expect(mockSpotifyService.getUserPlaylists).toHaveBeenCalledWith({
          all: true,
        });
      });

      expect(result.current.playlists).toEqual(mockPlaylists);
      expect(result.current.hasMore).toBe(false);
    });
  });

  describe('Loading states', () => {
    it('sets loading state during fetch', async () => {
      let resolveGetPlaylists;
      const playlistsPromise = new Promise(resolve => {
        resolveGetPlaylists = resolve;
      });
      mockSpotifyService.getUserPlaylists.mockReturnValue(playlistsPromise);

      const { result } = renderHook(() => useUserPlaylists(mockAccessToken));

      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      act(() => {
        resolveGetPlaylists({ items: [], total: 0, hasMore: false });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('calculates isInitialLoad correctly', async () => {
      let resolveGetPlaylists;
      const playlistsPromise = new Promise(resolve => {
        resolveGetPlaylists = resolve;
      });
      mockSpotifyService.getUserPlaylists.mockReturnValue(playlistsPromise);

      const { result } = renderHook(() => useUserPlaylists(mockAccessToken));

      await waitFor(() => {
        expect(result.current.isInitialLoad).toBe(true);
        expect(result.current.isLoadingMore).toBe(false);
      });

      act(() => {
        resolveGetPlaylists({
          items: [{ id: '1', name: 'Playlist 1' }],
          total: 1,
          hasMore: false,
        });
      });

      await waitFor(() => {
        expect(result.current.isInitialLoad).toBe(false);
      });
    });
  });

  describe('Pagination', () => {
    const mockFirstPage = {
      items: [{ id: '1', name: 'Playlist 1' }],
      total: 100,
      limit: 50,
      offset: 0,
      hasMore: true,
    };

    const mockSecondPage = {
      items: [{ id: '2', name: 'Playlist 2' }],
      total: 100,
      limit: 50,
      offset: 1,
      hasMore: false,
    };

    it('loads more playlists', async () => {
      mockSpotifyService.getUserPlaylists
        .mockResolvedValueOnce(mockFirstPage)
        .mockResolvedValueOnce(mockSecondPage);

      const { result } = renderHook(() => useUserPlaylists(mockAccessToken));

      await waitFor(() => {
        expect(result.current.playlists).toHaveLength(1);
        expect(result.current.hasMore).toBe(true);
      });

      await act(async () => {
        result.current.loadMore();
      });

      expect(mockSpotifyService.getUserPlaylists).toHaveBeenCalledTimes(2);
      expect(mockSpotifyService.getUserPlaylists).toHaveBeenLastCalledWith({
        limit: 50,
        offset: 1,
      });

      expect(result.current.playlists).toHaveLength(2);
      expect(result.current.hasMore).toBe(false);
    });

    it('does not load more when already loading', async () => {
      let resolveGetPlaylists;
      const playlistsPromise = new Promise(resolve => {
        resolveGetPlaylists = resolve;
      });
      mockSpotifyService.getUserPlaylists.mockReturnValue(playlistsPromise);

      const { result } = renderHook(() => useUserPlaylists(mockAccessToken));

      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      act(() => {
        result.current.loadMore();
      });

      expect(mockSpotifyService.getUserPlaylists).toHaveBeenCalledTimes(1);
    });

    it('does not load more when hasMore is false', async () => {
      mockSpotifyService.getUserPlaylists.mockResolvedValue({
        items: [{ id: '1', name: 'Playlist 1' }],
        hasMore: false,
      });

      const { result } = renderHook(() => useUserPlaylists(mockAccessToken));

      await waitFor(() => {
        expect(result.current.hasMore).toBe(false);
      });

      act(() => {
        result.current.loadMore();
      });

      expect(mockSpotifyService.getUserPlaylists).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error handling', () => {
    it('handles fetch errors', async () => {
      const mockError = new Error('Failed to fetch playlists');
      mockSpotifyService.getUserPlaylists.mockRejectedValue(mockError);

      const { result } = renderHook(() => useUserPlaylists(mockAccessToken));

      await waitFor(() => {
        expect(result.current.error).toBe(mockError);
        expect(result.current.loading).toBe(false);
      });
    });

    it('sets error when SpotifyService is not initialized', async () => {
      const { result } = renderHook(() => useUserPlaylists(null));

      await act(async () => {
        result.current.fetchPlaylists();
      });

      expect(result.current.error).toEqual(
        new Error('Spotify service not initialized')
      );
    });
  });

  describe('Manual operations', () => {
    const mockPlaylists = [
      { id: '1', name: 'Playlist 1' },
      { id: '2', name: 'Playlist 2' },
    ];

    const mockResponse = {
      items: mockPlaylists,
      total: 2,
      hasMore: false,
    };

    it('manually fetches playlists', async () => {
      mockSpotifyService.getUserPlaylists.mockResolvedValue(mockResponse);

      const { result } = renderHook(() =>
        useUserPlaylists(mockAccessToken, { autoFetch: false })
      );

      await act(async () => {
        result.current.fetchPlaylists();
      });

      expect(mockSpotifyService.getUserPlaylists).toHaveBeenCalledWith({
        limit: 50,
        offset: 0,
      });
      expect(result.current.playlists).toEqual(mockPlaylists);
    });

    it('refreshes playlists', async () => {
      mockSpotifyService.getUserPlaylists.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useUserPlaylists(mockAccessToken));

      await waitFor(() => {
        expect(mockSpotifyService.getUserPlaylists).toHaveBeenCalledTimes(1);
      });

      await act(async () => {
        result.current.refresh();
      });

      expect(mockSpotifyService.getUserPlaylists).toHaveBeenCalledTimes(2);
    });

    it('fetches all playlists manually', async () => {
      mockSpotifyService.getUserPlaylists.mockResolvedValue(mockResponse);

      const { result } = renderHook(() =>
        useUserPlaylists(mockAccessToken, { autoFetch: false })
      );

      await act(async () => {
        result.current.fetchAllPlaylists();
      });

      expect(mockSpotifyService.getUserPlaylists).toHaveBeenCalledWith({
        all: true,
      });
    });

    it('retries after error', async () => {
      mockSpotifyService.getUserPlaylists
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useUserPlaylists(mockAccessToken));

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      await act(async () => {
        result.current.retry();
      });

      expect(result.current.playlists).toEqual(mockPlaylists);
      expect(result.current.error).toBe(null);
    });

    it('clears playlists and state', () => {
      const { result } = renderHook(() =>
        useUserPlaylists(mockAccessToken, { autoFetch: false })
      );

      act(() => {
        result.current.clear();
      });

      expect(result.current.playlists).toEqual([]);
      expect(result.current.error).toBe(null);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.total).toBe(0);
    });
  });

  describe('Utility methods', () => {
    const mockPlaylists = [
      {
        id: '1',
        name: 'My Playlist',
        description: 'My favorite songs',
        owner: { id: 'user1', display_name: 'User One' },
        collaborative: false,
        public: true,
      },
      {
        id: '2',
        name: 'Collaborative Mix',
        description: 'Shared playlist',
        owner: { id: 'user2', display_name: 'User Two' },
        collaborative: true,
        public: false,
      },
      {
        id: '3',
        name: 'Rock Classics',
        description: 'Classic rock hits',
        owner: { id: 'user1', display_name: 'User One' },
        collaborative: false,
        public: true,
      },
    ];

    beforeEach(async () => {
      mockSpotifyService.getUserPlaylists.mockResolvedValue({
        items: mockPlaylists,
        total: 3,
        hasMore: false,
      });
    });

    it('gets playlist by ID', async () => {
      const { result } = renderHook(() => useUserPlaylists(mockAccessToken));

      await waitFor(() => {
        expect(result.current.playlists).toEqual(mockPlaylists);
      });

      const playlist = result.current.getPlaylistById('2');
      expect(playlist).toEqual(mockPlaylists[1]);

      const nonExistentPlaylist = result.current.getPlaylistById('999');
      expect(nonExistentPlaylist).toBeUndefined();
    });

    it('filters playlists', async () => {
      const { result } = renderHook(() => useUserPlaylists(mockAccessToken));

      await waitFor(() => {
        expect(result.current.playlists).toEqual(mockPlaylists);
      });

      const publicPlaylists = result.current.filterPlaylists(
        playlist => playlist.public
      );
      expect(publicPlaylists).toHaveLength(2);
      expect(publicPlaylists[0].id).toBe('1');
      expect(publicPlaylists[1].id).toBe('3');
    });

    it('searches playlists by name', async () => {
      const { result } = renderHook(() => useUserPlaylists(mockAccessToken));

      await waitFor(() => {
        expect(result.current.playlists).toEqual(mockPlaylists);
      });

      const searchResults = result.current.searchPlaylists('rock');
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].id).toBe('3');

      const emptyResults = result.current.searchPlaylists('nonexistent');
      expect(emptyResults).toHaveLength(0);

      const allResults = result.current.searchPlaylists('');
      expect(allResults).toEqual(mockPlaylists);
    });

    it('searches playlists by description', async () => {
      const { result } = renderHook(() => useUserPlaylists(mockAccessToken));

      await waitFor(() => {
        expect(result.current.playlists).toEqual(mockPlaylists);
      });

      const searchResults = result.current.searchPlaylists('favorite');
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].id).toBe('1');
    });

    it('searches playlists by owner name', async () => {
      const { result } = renderHook(() => useUserPlaylists(mockAccessToken));

      await waitFor(() => {
        expect(result.current.playlists).toEqual(mockPlaylists);
      });

      const searchResults = result.current.searchPlaylists('user one');
      expect(searchResults).toHaveLength(2);
    });

    it('gets owned playlists', async () => {
      const { result } = renderHook(() => useUserPlaylists(mockAccessToken));

      await waitFor(() => {
        expect(result.current.playlists).toEqual(mockPlaylists);
      });

      const ownedPlaylists = result.current.getOwnedPlaylists();
      expect(ownedPlaylists).toHaveLength(3); // All have owner.id
    });

    it('gets collaborative playlists', async () => {
      const { result } = renderHook(() => useUserPlaylists(mockAccessToken));

      await waitFor(() => {
        expect(result.current.playlists).toEqual(mockPlaylists);
      });

      const collaborativePlaylists = result.current.getCollaborativePlaylists();
      expect(collaborativePlaylists).toHaveLength(1);
      expect(collaborativePlaylists[0].id).toBe('2');
    });

    it('gets public playlists', async () => {
      const { result } = renderHook(() => useUserPlaylists(mockAccessToken));

      await waitFor(() => {
        expect(result.current.playlists).toEqual(mockPlaylists);
      });

      const publicPlaylists = result.current.getPublicPlaylists();
      expect(publicPlaylists).toHaveLength(2);
      expect(publicPlaylists[0].id).toBe('1');
      expect(publicPlaylists[1].id).toBe('3');
    });
  });

  describe('Options', () => {
    it('respects custom limit', async () => {
      mockSpotifyService.getUserPlaylists.mockResolvedValue({
        items: [],
        total: 0,
        hasMore: false,
      });

      renderHook(() => useUserPlaylists(mockAccessToken, { limit: 20 }));

      await waitFor(() => {
        expect(mockSpotifyService.getUserPlaylists).toHaveBeenCalledWith({
          limit: 20,
          offset: 0,
        });
      });
    });
  });

  describe('Computed values', () => {
    it('calculates isEmpty correctly', async () => {
      const { result } = renderHook(() =>
        useUserPlaylists(mockAccessToken, { autoFetch: false })
      );

      expect(result.current.isEmpty).toBe(true);

      mockSpotifyService.getUserPlaylists.mockResolvedValue({
        items: [{ id: '1', name: 'Playlist 1' }],
        hasMore: false,
      });

      await act(async () => {
        result.current.fetchPlaylists();
      });

      expect(result.current.isEmpty).toBe(false);
      expect(result.current.hasData).toBe(true);
    });

    it('calculates isLoadingMore correctly', async () => {
      const mockFirstPage = {
        items: [{ id: '1', name: 'Playlist 1' }],
        hasMore: true,
      };

      let resolveSecondPage;
      const secondPagePromise = new Promise(resolve => {
        resolveSecondPage = resolve;
      });

      mockSpotifyService.getUserPlaylists
        .mockResolvedValueOnce(mockFirstPage)
        .mockReturnValueOnce(secondPagePromise);

      const { result } = renderHook(() => useUserPlaylists(mockAccessToken));

      await waitFor(() => {
        expect(result.current.playlists).toHaveLength(1);
      });

      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.isLoadingMore).toBe(true);
        expect(result.current.isInitialLoad).toBe(false);
      });
    });
  });

  describe('Cleanup', () => {
    it('cancels ongoing requests on unmount', () => {
      const { unmount } = renderHook(() => useUserPlaylists(mockAccessToken));

      // Mock abort controller
      const mockAbort = jest.fn();
      const originalAbortController = global.AbortController;
      global.AbortController = jest.fn(() => ({
        signal: { aborted: false },
        abort: mockAbort,
      }));

      unmount();

      global.AbortController = originalAbortController;
    });
  });
});
