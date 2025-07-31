import { renderHook, act, waitFor } from '@testing-library/react';
import { usePlaylistSearch } from '../usePlaylistSearch';
import { getSpotifyApi } from '../../utils/spotify';

// Mock the Spotify API utility
jest.mock('../../utils/spotify');
const mockGetSpotifyApi = getSpotifyApi as jest.MockedFunction<
  typeof getSpotifyApi
>;

const mockApiResponse = {
  data: {
    playlists: {
      items: [
        {
          id: 'playlist1',
          name: 'Test Playlist 1',
          owner: { display_name: 'Test User' },
          tracks: { total: 25 },
          images: [{ url: 'https://example.com/image1.jpg' }],
        },
        {
          id: 'playlist2',
          name: 'Test Playlist 2',
          owner: { display_name: 'Another User' },
          tracks: { total: 30 },
          images: [{ url: 'https://example.com/image2.jpg' }],
        },
      ],
    },
  },
};

describe('usePlaylistSearch', () => {
  const mockGet = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockGetSpotifyApi.mockReturnValue({
      get: mockGet,
    } as any);

    mockGet.mockResolvedValue(mockApiResponse);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial State', () => {
    it('returns initial state correctly', () => {
      const { result } = renderHook(() =>
        usePlaylistSearch({
          accessToken: 'test-token',
          debounceMs: 150,
          limit: 10,
        })
      );

      expect(result.current.query).toBe('');
      expect(result.current.results).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.showResults).toBe(false);
    });
  });

  describe('Search Functionality', () => {
    it('performs search when query is set', async () => {
      const { result } = renderHook(() =>
        usePlaylistSearch({
          accessToken: 'test-token',
          debounceMs: 150,
          limit: 10,
        })
      );

      act(() => {
        result.current.setQuery('test query');
      });

      // Fast-forward past debounce delay
      act(() => {
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith(
          '/search?q=test%20query&type=playlist&limit=10'
        );
      });

      await waitFor(() => {
        expect(result.current.results).toEqual(
          mockApiResponse.data.playlists.items
        );
      });

      await waitFor(() => {
        expect(result.current.showResults).toBe(true);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('debounces search requests', async () => {
      const { result } = renderHook(() =>
        usePlaylistSearch({
          accessToken: 'test-token',
          debounceMs: 150,
          limit: 10,
        })
      );

      // Set query multiple times quickly
      act(() => {
        result.current.setQuery('test');
      });

      act(() => {
        result.current.setQuery('test query');
      });

      act(() => {
        result.current.setQuery('test query final');
      });

      // Fast-forward past debounce delay
      act(() => {
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith(
          '/search?q=test%20query%20final&type=playlist&limit=10'
        );
      });
    });

    it('does not search for empty queries', async () => {
      const { result } = renderHook(() =>
        usePlaylistSearch({
          accessToken: 'test-token',
          debounceMs: 150,
          limit: 10,
        })
      );

      act(() => {
        result.current.setQuery('   '); // Empty/whitespace query
      });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(mockGet).not.toHaveBeenCalled();
      expect(result.current.results).toEqual([]);
      expect(result.current.showResults).toBe(false);
    });

    it('does not search for Spotify URLs', async () => {
      const { result } = renderHook(() =>
        usePlaylistSearch({
          accessToken: 'test-token',
          debounceMs: 150,
          limit: 10,
        })
      );

      act(() => {
        result.current.setQuery('https://open.spotify.com/playlist/test');
      });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(mockGet).not.toHaveBeenCalled();
      expect(result.current.results).toEqual([]);
      expect(result.current.showResults).toBe(false);
    });

    it('handles search errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockGet.mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() =>
        usePlaylistSearch({
          accessToken: 'test-token',
          debounceMs: 150,
          limit: 10,
        })
      );

      act(() => {
        result.current.setQuery('test query');
      });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(result.current.error).toBe(
          'Failed to search playlists. Please try again.'
        );
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.results).toEqual([]);
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to search playlists:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Loading States', () => {
    it('sets loading state during search', async () => {
      let resolvePromise: (value: any) => void;
      const searchPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      mockGet.mockReturnValue(searchPromise);

      const { result } = renderHook(() =>
        usePlaylistSearch({
          accessToken: 'test-token',
          debounceMs: 150,
          limit: 10,
        })
      );

      act(() => {
        result.current.setQuery('test query');
      });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      act(() => {
        resolvePromise!(mockApiResponse);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('Utility Functions', () => {
    it('clears results when clearResults is called', () => {
      const { result } = renderHook(() =>
        usePlaylistSearch({
          accessToken: 'test-token',
          debounceMs: 150,
          limit: 10,
        })
      );

      // Set some initial state
      act(() => {
        result.current.setQuery('test');
      });

      // Clear results
      act(() => {
        result.current.clearResults();
      });

      expect(result.current.results).toEqual([]);
      expect(result.current.showResults).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('handles showResults state changes', () => {
      const { result } = renderHook(() =>
        usePlaylistSearch({
          accessToken: 'test-token',
          debounceMs: 150,
          limit: 10,
        })
      );

      act(() => {
        result.current.setShowResults(true);
      });

      expect(result.current.showResults).toBe(true);

      act(() => {
        result.current.setShowResults(false);
      });

      expect(result.current.showResults).toBe(false);
    });
  });

  describe('Access Token Handling', () => {
    it('does not search without access token', async () => {
      const { result } = renderHook(() =>
        usePlaylistSearch({
          accessToken: null,
          debounceMs: 150,
          limit: 10,
        })
      );

      act(() => {
        result.current.setQuery('test query');
      });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(mockGet).not.toHaveBeenCalled();
      expect(result.current.results).toEqual([]);
    });

    it('handles access token changes', async () => {
      const { result, rerender } = renderHook(
        ({ accessToken }) =>
          usePlaylistSearch({
            accessToken,
            debounceMs: 150,
            limit: 10,
          }),
        {
          initialProps: { accessToken: null },
        }
      );

      act(() => {
        result.current.setQuery('test query');
      });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(mockGet).not.toHaveBeenCalled();

      // Update with valid access token
      rerender({ accessToken: 'test-token' });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith(
          '/search?q=test%20query&type=playlist&limit=10'
        );
      });
    });
  });

  describe('Cleanup', () => {
    it('cancels pending requests on unmount', async () => {
      const abortSpy = jest.fn();
      const mockAbortController = {
        abort: abortSpy,
        signal: { aborted: false },
      };

      jest
        .spyOn(global, 'AbortController')
        .mockImplementation(() => mockAbortController as any);

      const { result, unmount } = renderHook(() =>
        usePlaylistSearch({
          accessToken: 'test-token',
          debounceMs: 150,
          limit: 10,
        })
      );

      act(() => {
        result.current.setQuery('test query');
      });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      unmount();

      expect(abortSpy).toHaveBeenCalled();
    });

    it('clears debounce timeout on unmount', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const { result, unmount } = renderHook(() =>
        usePlaylistSearch({
          accessToken: 'test-token',
          debounceMs: 150,
          limit: 10,
        })
      );

      act(() => {
        result.current.setQuery('test query');
      });

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });
});
