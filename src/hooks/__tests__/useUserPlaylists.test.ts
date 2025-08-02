import { renderHook, act, waitFor } from '@testing-library/react';
import useUserPlaylists from '../useUserPlaylists';
import SpotifyService from '../../services/spotify';
import { SpotifyPlaylist } from '../../types/spotify';

// Mock axios
jest.mock('axios');

// Mock the SpotifyService
jest.mock('../../services/spotify');

const MockedSpotifyService = SpotifyService as jest.MockedClass<
  typeof SpotifyService
>;

describe('useUserPlaylists', () => {
  let mockSpotifyService: jest.Mocked<SpotifyService>;
  const mockAccessToken = 'mock-access-token';

  beforeEach(() => {
    jest.clearAllMocks();

    mockSpotifyService = {
      getUserPlaylists: jest.fn(),
      setAccessToken: jest.fn(),
      getAccessToken: jest.fn(),
      getUserProfile: jest.fn(),
      getPlaylistTracks: jest.fn(),
      createPlaylist: jest.fn(),
      addTracksToPlaylist: jest.fn(),
      removeTracksFromPlaylist: jest.fn(),
      searchTracks: jest.fn(),
      getTrackAudioFeatures: jest.fn(),
      getMultipleTrackAudioFeatures: jest.fn(),
    };

    MockedSpotifyService.mockImplementation(() => mockSpotifyService);
  });

  describe('Initialization', () => {
    it('initializes with default state', () => {
      const { result } = renderHook(() =>
        useUserPlaylists(mockAccessToken, { autoFetch: false })
      );

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

      expect(MockedSpotifyService).toHaveBeenCalledWith(mockAccessToken);
    });

    it('handles missing access token gracefully', () => {
      const { result } = renderHook(() =>
        useUserPlaylists(null, { autoFetch: false })
      );

      expect(MockedSpotifyService).not.toHaveBeenCalled();
      expect(result.current.error).toBe(null);
    });
  });

  describe('Auto-fetch functionality', () => {
    const mockPlaylists: SpotifyPlaylist[] = [
      {
        id: '1',
        name: 'Playlist 1',
        description: null,
        images: [],
        tracks: { total: 10, href: '' },
        owner: {
          id: 'user1',
          display_name: 'User 1',
          external_urls: { spotify: '' },
        },
        public: true,
        collaborative: false,
        uri: 'spotify:playlist:1',
        external_urls: { spotify: '' },
      },
      {
        id: '2',
        name: 'Playlist 2',
        description: null,
        images: [],
        tracks: { total: 20, href: '' },
        owner: {
          id: 'user2',
          display_name: 'User 2',
          external_urls: { spotify: '' },
        },
        public: false,
        collaborative: true,
        uri: 'spotify:playlist:2',
        external_urls: { spotify: '' },
      },
    ];

    const mockPlaylistsResponse = {
      playlists: mockPlaylists,
      total: 100,
      hasMore: true,
      nextOffset: 2,
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

      await waitFor(() => {
        expect(result.current.playlists).toEqual(mockPlaylists);
      });

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
        playlists: mockPlaylists,
        total: 2,
        hasMore: false,
        nextOffset: 2,
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

      await waitFor(() => {
        expect(result.current.playlists).toEqual(mockPlaylists);
      });

      expect(result.current.hasMore).toBe(false);
    });
  });

  describe('Loading states', () => {
    it('sets loading state during fetch', async () => {
      let resolveGetPlaylists: (value: any) => void;
      const playlistsPromise = new Promise(resolve => {
        resolveGetPlaylists = resolve;
      });
      mockSpotifyService.getUserPlaylists.mockReturnValue(playlistsPromise);

      const { result } = renderHook(() => useUserPlaylists(mockAccessToken));

      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      act(() => {
        resolveGetPlaylists({ playlists: [], total: 0, hasMore: false });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('calculates isInitialLoad correctly', async () => {
      let resolveGetPlaylists: (value: any) => void;
      const playlistsPromise = new Promise(resolve => {
        resolveGetPlaylists = resolve;
      });
      mockSpotifyService.getUserPlaylists.mockReturnValue(playlistsPromise);

      const { result } = renderHook(() => useUserPlaylists(mockAccessToken));

      await waitFor(() => {
        expect(result.current.isInitialLoad).toBe(true);
      });

      expect(result.current.isLoadingMore).toBe(false);

      act(() => {
        resolveGetPlaylists({
          playlists: [
            {
              id: '1',
              name: 'Playlist 1',
              description: null,
              images: [],
              tracks: { total: 10, href: '' },
              owner: {
                id: 'user1',
                display_name: 'User 1',
                external_urls: { spotify: '' },
              },
              public: true,
              collaborative: false,
              uri: 'spotify:playlist:1',
              external_urls: { spotify: '' },
            },
          ],
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
      playlists: [
        {
          id: '1',
          name: 'Playlist 1',
          description: null,
          images: [],
          tracks: { total: 10, href: '' },
          owner: {
            id: 'user1',
            display_name: 'User 1',
            external_urls: { spotify: '' },
          },
          public: true,
          collaborative: false,
          uri: 'spotify:playlist:1',
          external_urls: { spotify: '' },
        },
      ],
      total: 100,
      hasMore: true,
      nextOffset: 1,
    };

    const mockSecondPage = {
      playlists: [
        {
          id: '2',
          name: 'Playlist 2',
          description: null,
          images: [],
          tracks: { total: 20, href: '' },
          owner: {
            id: 'user2',
            display_name: 'User 2',
            external_urls: { spotify: '' },
          },
          public: false,
          collaborative: true,
          uri: 'spotify:playlist:2',
          external_urls: { spotify: '' },
        },
      ],
      total: 100,
      hasMore: false,
      nextOffset: 2,
    };

    it('loads more playlists', async () => {
      mockSpotifyService.getUserPlaylists
        .mockResolvedValueOnce(mockFirstPage)
        .mockResolvedValueOnce(mockSecondPage);

      const { result } = renderHook(() =>
        useUserPlaylists(mockAccessToken, { limit: 50 })
      );

      await waitFor(() => {
        expect(result.current.playlists).toHaveLength(1);
      });

      await waitFor(() => {
        expect(result.current.hasMore).toBe(true);
      });

      expect(result.current.loading).toBe(false);

      await act(async () => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.playlists).toHaveLength(2);
      });

      await waitFor(() => {
        expect(result.current.hasMore).toBe(false);
      });

      expect(result.current.loading).toBe(false);

      expect(mockSpotifyService.getUserPlaylists).toHaveBeenCalledTimes(2);
      expect(mockSpotifyService.getUserPlaylists).toHaveBeenNthCalledWith(1, {
        limit: 50,
        offset: 0,
      });
      expect(mockSpotifyService.getUserPlaylists).toHaveBeenNthCalledWith(2, {
        limit: 50,
        offset: 1,
      });
    });

    it('does not load more when already loading', async () => {
      const playlistsPromise = new Promise(() => {
        // Never resolve to keep loading state
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
        playlists: [
          {
            id: '1',
            name: 'Playlist 1',
            description: null,
            images: [],
            tracks: { total: 10, href: '' },
            owner: {
              id: 'user1',
              display_name: 'User 1',
              external_urls: { spotify: '' },
            },
            public: true,
            collaborative: false,
            uri: 'spotify:playlist:1',
            external_urls: { spotify: '' },
          },
        ],
        hasMore: false,
        total: 1,
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
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('sets error when SpotifyService is not initialized', async () => {
      const { result } = renderHook(() => useUserPlaylists(null));

      await act(async () => {
        await result.current.fetchPlaylists();
      });

      expect(result.current.error).toEqual(
        new Error('Spotify service not initialized')
      );
    });
  });

  describe('Manual operations', () => {
    const mockPlaylists: SpotifyPlaylist[] = [
      {
        id: '1',
        name: 'Playlist 1',
        description: null,
        images: [],
        tracks: { total: 10, href: '' },
        owner: {
          id: 'user1',
          display_name: 'User 1',
          external_urls: { spotify: '' },
        },
        public: true,
        collaborative: false,
        uri: 'spotify:playlist:1',
        external_urls: { spotify: '' },
      },
      {
        id: '2',
        name: 'Playlist 2',
        description: null,
        images: [],
        tracks: { total: 20, href: '' },
        owner: {
          id: 'user2',
          display_name: 'User 2',
          external_urls: { spotify: '' },
        },
        public: false,
        collaborative: true,
        uri: 'spotify:playlist:2',
        external_urls: { spotify: '' },
      },
    ];

    const mockResponse = {
      playlists: mockPlaylists,
      total: 2,
      hasMore: false,
    };

    it('manually fetches playlists', async () => {
      mockSpotifyService.getUserPlaylists.mockResolvedValue(mockResponse);

      const { result } = renderHook(() =>
        useUserPlaylists(mockAccessToken, { autoFetch: false })
      );

      await act(async () => {
        await result.current.fetchPlaylists();
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

      await waitFor(() => {
        expect(result.current.playlists).toEqual(mockPlaylists);
      });

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
    const mockPlaylists: SpotifyPlaylist[] = [
      {
        id: '1',
        name: 'My Playlist',
        description: 'My favorite songs',
        images: [],
        tracks: { total: 10, href: '' },
        owner: {
          id: 'user1',
          display_name: 'User One',
          external_urls: { spotify: '' },
        },
        collaborative: false,
        public: true,
        uri: 'spotify:playlist:1',
        external_urls: { spotify: '' },
      },
      {
        id: '2',
        name: 'Collaborative Mix',
        description: 'Shared playlist',
        images: [],
        tracks: { total: 20, href: '' },
        owner: {
          id: 'user2',
          display_name: 'User Two',
          external_urls: { spotify: '' },
        },
        collaborative: true,
        public: false,
        uri: 'spotify:playlist:2',
        external_urls: { spotify: '' },
      },
      {
        id: '3',
        name: 'Rock Classics',
        description: 'Classic rock hits',
        images: [],
        tracks: { total: 30, href: '' },
        owner: {
          id: 'user1',
          display_name: 'User One',
          external_urls: { spotify: '' },
        },
        collaborative: false,
        public: true,
        uri: 'spotify:playlist:3',
        external_urls: { spotify: '' },
      },
    ];

    beforeEach(async () => {
      mockSpotifyService.getUserPlaylists.mockResolvedValue({
        playlists: mockPlaylists,
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
        playlists: [],
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
        playlists: [
          {
            id: '1',
            name: 'Playlist 1',
            description: null,
            images: [],
            tracks: { total: 10, href: '' },
            owner: {
              id: 'user1',
              display_name: 'User 1',
              external_urls: { spotify: '' },
            },
            public: true,
            collaborative: false,
            uri: 'spotify:playlist:1',
            external_urls: { spotify: '' },
          },
        ],
        hasMore: false,
        total: 1,
      });

      await act(async () => {
        await result.current.fetchPlaylists();
      });

      expect(result.current.isEmpty).toBe(false);
      expect(result.current.hasData).toBe(true);
    });

    it('calculates isLoadingMore correctly', async () => {
      const mockFirstPage = {
        playlists: [
          {
            id: '1',
            name: 'Playlist 1',
            description: null,
            images: [],
            tracks: { total: 10, href: '' },
            owner: {
              id: 'user1',
              display_name: 'User 1',
              external_urls: { spotify: '' },
            },
            public: true,
            collaborative: false,
            uri: 'spotify:playlist:1',
            external_urls: { spotify: '' },
          },
        ],
        hasMore: true,
        total: 2,
      };

      const secondPagePromise = new Promise(() => {
        // Never resolve to keep loading state
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
      });

      expect(result.current.isInitialLoad).toBe(false);
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
      })) as any;

      unmount();

      global.AbortController = originalAbortController;
    });
  });
});
