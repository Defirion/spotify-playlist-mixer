import { renderHook, act } from '@testing-library/react';
import { useSpotifyUrlHandler } from '../useSpotifyUrlHandler';
import { getSpotifyApi } from '../../utils/spotify';
import { SpotifyPlaylist } from '../../types';

// Mock the Spotify API utility
jest.mock('../../utils/spotify');
const mockGetSpotifyApi = getSpotifyApi as jest.MockedFunction<
  typeof getSpotifyApi
>;

const mockPlaylist: SpotifyPlaylist = {
  id: 'test123456789012345678',
  name: 'Test Playlist',
  description: 'A test playlist',
  images: [{ url: 'https://example.com/image.jpg', height: 300, width: 300 }],
  tracks: {
    total: 25,
    href: 'https://api.spotify.com/v1/playlists/test123456789012345678/tracks',
  },
  owner: {
    id: 'user1',
    display_name: 'Test User',
    external_urls: { spotify: 'https://open.spotify.com/user/user1' },
  },
  public: true,
  collaborative: false,
  uri: 'spotify:playlist:test123456789012345678',
  external_urls: {
    spotify: 'https://open.spotify.com/playlist/test123456789012345678',
  },
};

const mockTracksResponse = {
  data: {
    items: [
      {
        track: {
          id: 'track1',
          name: 'Track 1',
          duration_ms: 180000,
        },
      },
      {
        track: {
          id: 'track2',
          name: 'Track 2',
          duration_ms: 210000,
        },
      },
    ],
  },
};

describe('useSpotifyUrlHandler', () => {
  const mockGet = jest.fn();
  const mockOnPlaylistSelect = jest.fn();
  const mockOnError = jest.fn();

  const defaultProps: {
    accessToken: string | null;
    selectedPlaylists: any[];
    onPlaylistSelect: (p: any) => void;
    onError: (e: any) => void;
  } = {
    accessToken: 'test-token',
    selectedPlaylists: [],
    onPlaylistSelect: mockOnPlaylistSelect,
    onError: mockOnError,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockGetSpotifyApi.mockReturnValue({
      get: mockGet,
    } as any);

    // Reset mock implementations for each test
    mockGet.mockReset();
  });

  // Silence console.error for tests that intentionally trigger errors.
  let consoleErrorSpy: jest.SpyInstance;
  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('URL Validation', () => {
    it('validates Spotify links correctly', () => {
      const { result } = renderHook(() => useSpotifyUrlHandler(defaultProps));

      expect(
        result.current.isValidSpotifyLink(
          'https://open.spotify.com/playlist/test'
        )
      ).toBe(true);
      expect(
        result.current.isValidSpotifyLink('https://spotify.com/playlist/test')
      ).toBe(true);
      expect(result.current.isValidSpotifyLink('spotify:playlist:test')).toBe(
        true
      );
      expect(
        result.current.isValidSpotifyLink('https://open.spotify.com/track/test')
      ).toBe(true);
      expect(
        result.current.isValidSpotifyLink('https://open.spotify.com/album/test')
      ).toBe(true);

      expect(
        result.current.isValidSpotifyLink('https://example.com/playlist/test')
      ).toBe(false);
      expect(result.current.isValidSpotifyLink('not a url')).toBe(false);
      expect(result.current.isValidSpotifyLink('')).toBe(false);
    });

    it('validates playlist URLs correctly', () => {
      const { result } = renderHook(() => useSpotifyUrlHandler(defaultProps));

      expect(
        result.current.isValidPlaylistUrl(
          'https://open.spotify.com/playlist/test123456789012345678'
        )
      ).toBe(true);
      expect(
        result.current.isValidPlaylistUrl(
          'spotify:playlist:test123456789012345678'
        )
      ).toBe(true);
      expect(result.current.isValidPlaylistUrl('test123456789012345678')).toBe(
        true
      ); // 22 character ID

      expect(
        result.current.isValidPlaylistUrl('https://open.spotify.com/track/test')
      ).toBe(false);
      expect(result.current.isValidPlaylistUrl('short')).toBe(false);
      expect(result.current.isValidPlaylistUrl('')).toBe(false);
    });

    it('extracts playlist IDs correctly', () => {
      const { result } = renderHook(() => useSpotifyUrlHandler(defaultProps));
      // use a 22-character playlist id which the hook expects
      const longId = 'test123456789012345678';

      expect(
        result.current.extractPlaylistId(
          `https://open.spotify.com/playlist/${longId}`
        )
      ).toBe(longId);
      expect(
        result.current.extractPlaylistId(`spotify:playlist:${longId}`)
      ).toBe(longId);
      expect(result.current.extractPlaylistId(longId)).toBe(longId);
      expect(
        result.current.extractPlaylistId(
          `https://open.spotify.com/playlist/${longId}?si=abc`
        )
      ).toBe(longId);

      expect(result.current.extractPlaylistId('invalid-url')).toBe(null);
      expect(result.current.extractPlaylistId('')).toBe(null);
    });
  });

  describe('Playlist Addition', () => {
    it('successfully adds a playlist by URL', async () => {
      // Setup mocks for this specific test
      mockGet
        .mockResolvedValueOnce({ data: mockPlaylist }) // First call for playlist data
        .mockResolvedValue(mockTracksResponse); // Subsequent calls for tracks

      const { result } = renderHook(() => useSpotifyUrlHandler(defaultProps));

      await act(async () => {
        await result.current.handleAddPlaylistByUrl(
          'https://open.spotify.com/playlist/test123456789012345678'
        );
      });

      expect(mockGet).toHaveBeenCalledWith('/playlists/test123456789012345678');
      expect(mockGet).toHaveBeenCalledWith(
        '/playlists/test123456789012345678/tracks?offset=0&limit=100'
      );

      expect(mockOnPlaylistSelect).toHaveBeenCalledWith({
        ...mockPlaylist,
        coverImage: 'https://example.com/image.jpg',
        realAverageDurationSeconds: 195, // (180000 + 210000) / 2 / 1000
        tracksWithDuration: 2,
      });
    });

    it('handles playlists without images', async () => {
      const playlistWithoutImages = { ...mockPlaylist, images: [] };
      mockGet
        .mockResolvedValueOnce({ data: playlistWithoutImages })
        .mockResolvedValue(mockTracksResponse);

      const { result } = renderHook(() => useSpotifyUrlHandler(defaultProps));

      await act(async () => {
        await result.current.handleAddPlaylistByUrl(
          'https://open.spotify.com/playlist/test123456789012345678'
        );
      });

      expect(mockOnPlaylistSelect).toHaveBeenCalledWith({
        ...playlistWithoutImages,
        coverImage: null,
        realAverageDurationSeconds: 195,
        tracksWithDuration: 2,
      });
    });

    it('handles playlists with no valid tracks', async () => {
      const emptyTracksResponse = {
        data: {
          items: [
            { track: null }, // Invalid track
            { track: { id: null, duration_ms: null } }, // Invalid track
          ],
        },
      };
      mockGet
        .mockResolvedValueOnce({ data: mockPlaylist })
        .mockResolvedValue(emptyTracksResponse);

      const { result } = renderHook(() => useSpotifyUrlHandler(defaultProps));

      await act(async () => {
        await result.current.handleAddPlaylistByUrl(
          'https://open.spotify.com/playlist/test123456789012345678'
        );
      });

      expect(mockOnPlaylistSelect).toHaveBeenCalledWith({
        ...mockPlaylist,
        coverImage: 'https://example.com/image.jpg',
        realAverageDurationSeconds: null,
        tracksWithDuration: 0,
      });
    });

    it('handles pagination for large playlists', async () => {
      const firstBatch = {
        data: {
          items: Array.from({ length: 100 }, (_, i) => ({
            track: {
              id: `track${i}`,
              name: `Track ${i}`,
              duration_ms: 180000,
            },
          })),
        },
      };

      const secondBatch = {
        data: {
          items: Array.from({ length: 50 }, (_, i) => ({
            track: {
              id: `track${i + 100}`,
              name: `Track ${i + 100}`,
              duration_ms: 180000,
            },
          })),
        },
      };

      mockGet
        .mockResolvedValueOnce({ data: mockPlaylist })
        .mockResolvedValueOnce(firstBatch)
        .mockResolvedValueOnce(secondBatch);

      const { result } = renderHook(() => useSpotifyUrlHandler(defaultProps));

      await act(async () => {
        await result.current.handleAddPlaylistByUrl(
          'https://open.spotify.com/playlist/test123456789012345678'
        );
      });

      expect(mockGet).toHaveBeenCalledWith(
        '/playlists/test123456789012345678/tracks?offset=0&limit=100'
      );
      expect(mockGet).toHaveBeenCalledWith(
        '/playlists/test123456789012345678/tracks?offset=100&limit=100'
      );

      expect(mockOnPlaylistSelect).toHaveBeenCalledWith({
        ...mockPlaylist,
        coverImage: 'https://example.com/image.jpg',
        realAverageDurationSeconds: 180, // All tracks have same duration
        tracksWithDuration: 150, // 100 + 50 tracks
      });
    });
  });

  describe('Error Handling', () => {
    it('handles invalid playlist URLs', async () => {
      const { result } = renderHook(() => useSpotifyUrlHandler(defaultProps));

      await act(async () => {
        await result.current.handleAddPlaylistByUrl('invalid-url');
      });

      expect(mockOnError).toHaveBeenCalledWith(
        'Invalid Spotify playlist URL. Please use a valid Spotify playlist link.'
      );
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('handles already selected playlists', async () => {
      const propsWithSelectedPlaylist = {
        ...defaultProps,
        selectedPlaylists: [mockPlaylist],
      };

      const { result } = renderHook(() =>
        useSpotifyUrlHandler(propsWithSelectedPlaylist)
      );

      await act(async () => {
        await result.current.handleAddPlaylistByUrl(
          'https://open.spotify.com/playlist/test123456789012345678'
        );
      });

      expect(mockOnError).toHaveBeenCalledWith(
        'This playlist is already added'
      );
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('handles 404 errors', async () => {
      const error404 = { response: { status: 404 } };
      mockGet.mockRejectedValue(error404);

      const { result } = renderHook(() => useSpotifyUrlHandler(defaultProps));

      await act(async () => {
        await result.current.handleAddPlaylistByUrl(
          'https://open.spotify.com/playlist/test123456789012345678'
        );
      });

      expect(mockOnError).toHaveBeenCalledWith(
        'Playlist not found. Make sure the playlist is public or you have access to it.'
      );
    });

    it('handles 403 errors', async () => {
      const error403 = { response: { status: 403 } };
      mockGet.mockRejectedValue(error403);

      const { result } = renderHook(() => useSpotifyUrlHandler(defaultProps));

      await act(async () => {
        await result.current.handleAddPlaylistByUrl(
          'https://open.spotify.com/playlist/test123456789012345678'
        );
      });

      expect(mockOnError).toHaveBeenCalledWith(
        'Access denied. The playlist might be private.'
      );
    });

    it('handles generic errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const genericError = new Error('Network error');
      mockGet.mockRejectedValue(genericError);

      const { result } = renderHook(() => useSpotifyUrlHandler(defaultProps));

      await act(async () => {
        await result.current.handleAddPlaylistByUrl(
          'https://open.spotify.com/playlist/test123456789012345678'
        );
      });

      expect(mockOnError).toHaveBeenCalledWith(
        'Failed to load playlist. Please check the URL and try again.'
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(genericError);

      consoleErrorSpy.mockRestore();
    });

    it('handles missing access token', async () => {
      const propsWithoutToken = {
        ...defaultProps,
        accessToken: null,
      };

      const { result } = renderHook(() =>
        useSpotifyUrlHandler(propsWithoutToken)
      );

      await act(async () => {
        await result.current.handleAddPlaylistByUrl(
          'https://open.spotify.com/playlist/test123456789012345678'
        );
      });

      expect(mockOnError).toHaveBeenCalledWith('No access token available');
      expect(mockGet).not.toHaveBeenCalled();
    });
  });

  describe('Dependency Updates', () => {
    it('updates when selectedPlaylists change', async () => {
      const { result, rerender } = renderHook(
        props => useSpotifyUrlHandler(props),
        { initialProps: defaultProps }
      );

      // Add playlist successfully first time
      // ensure the mocked API returns playlist data and tracks
      mockGet
        .mockResolvedValueOnce({ data: mockPlaylist })
        .mockResolvedValue(mockTracksResponse);

      await act(async () => {
        await result.current.handleAddPlaylistByUrl(
          'https://open.spotify.com/playlist/test123456789012345678'
        );
      });

      expect(mockOnPlaylistSelect).toHaveBeenCalled();
      jest.clearAllMocks();

      // Update props with the playlist now selected
      rerender({
        ...defaultProps,
        selectedPlaylists: [mockPlaylist],
      });

      // Try to add the same playlist again
      await act(async () => {
        await result.current.handleAddPlaylistByUrl(
          'https://open.spotify.com/playlist/test123456789012345678'
        );
      });

      expect(mockOnError).toHaveBeenCalledWith(
        'This playlist is already added'
      );
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('updates when access token changes', async () => {
      const { result, rerender } = renderHook(
        props => useSpotifyUrlHandler(props),
        { initialProps: { ...defaultProps, accessToken: null } }
      );

      // Try without access token
      await act(async () => {
        await result.current.handleAddPlaylistByUrl(
          'https://open.spotify.com/playlist/test-playlist-id'
        );
      });

      expect(mockOnError).toHaveBeenCalledWith('No access token available');
      jest.clearAllMocks();

      // Update with access token
      rerender({ ...defaultProps, accessToken: 'new-token' } as any);

      // Try again with access token
      // ensure mocked API resolves for the successful add
      mockGet
        .mockResolvedValueOnce({ data: mockPlaylist })
        .mockResolvedValue(mockTracksResponse);

      await act(async () => {
        await result.current.handleAddPlaylistByUrl(
          'https://open.spotify.com/playlist/test123456789012345678'
        );
      });

      expect(mockGetSpotifyApi).toHaveBeenCalledWith('new-token');
      expect(mockOnPlaylistSelect).toHaveBeenCalled();
    });
  });
});
