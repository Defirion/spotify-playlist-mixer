import { renderHook, act, waitFor } from '@testing-library/react';
import useSpotifySearch from '../useSpotifySearch';
import SpotifyService from '../../services/spotify';

// Mock axios
jest.mock('axios');

// Mock the SpotifyService
jest.mock('../../services/spotify');

describe('useSpotifySearch', () => {
  let mockSpotifyService;
  const mockAccessToken = 'mock-access-token';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockSpotifyService = {
      searchTracks: jest.fn(),
    };

    SpotifyService.mockImplementation(() => mockSpotifyService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    it('initializes with default state', () => {
      const { result } = renderHook(() => useSpotifySearch(mockAccessToken));

      expect(result.current.query).toBe('');
      expect(result.current.results).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.total).toBe(0);
      expect(result.current.isEmpty).toBe(true);
    });

    it('creates SpotifyService instance with access token', () => {
      renderHook(() => useSpotifySearch(mockAccessToken));

      expect(SpotifyService).toHaveBeenCalledWith(mockAccessToken);
    });

    it('handles missing access token gracefully', () => {
      const { result } = renderHook(() => useSpotifySearch(null));

      expect(SpotifyService).not.toHaveBeenCalled();
      expect(result.current.error).toBe(null);
    });
  });

  describe('Search functionality', () => {
    const mockSearchResults = {
      tracks: [
        { id: '1', name: 'Track 1', artists: [{ name: 'Artist 1' }] },
        { id: '2', name: 'Track 2', artists: [{ name: 'Artist 2' }] },
      ],
      total: 100,
      limit: 20,
      offset: 0,
      hasMore: true,
    };

    it('performs search when query changes with debouncing', async () => {
      mockSpotifyService.searchTracks.mockResolvedValue(mockSearchResults);

      const { result } = renderHook(() => useSpotifySearch(mockAccessToken));

      await act(async () => {
        result.current.setQuery('test query');
      });

      // Should not search immediately
      expect(mockSpotifyService.searchTracks).not.toHaveBeenCalled();

      // Fast-forward past debounce delay
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockSpotifyService.searchTracks).toHaveBeenCalledWith(
          'test query',
          {
            limit: 20,
            offset: 0,
            market: undefined,
          }
        );
      });

      expect(result.current.results).toEqual(mockSearchResults.tracks);
      expect(result.current.total).toBe(100);
      expect(result.current.hasMore).toBe(true);
    });

    it('cancels previous search when new query is set', async () => {
      mockSpotifyService.searchTracks.mockResolvedValue(mockSearchResults);

      const { result } = renderHook(() => useSpotifySearch(mockAccessToken));

      act(() => {
        result.current.setQuery('first query');
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      act(() => {
        result.current.setQuery('second query');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockSpotifyService.searchTracks).toHaveBeenCalledTimes(1);
      });
      await waitFor(() => {
        expect(mockSpotifyService.searchTracks).toHaveBeenCalledWith(
          'second query',
          expect.any(Object)
        );
      });
    });

    it('clears results when query is empty', () => {
      const { result } = renderHook(() => useSpotifySearch(mockAccessToken));

      act(() => {
        result.current.setQuery('test');
      });

      act(() => {
        result.current.setQuery('');
      });

      expect(result.current.results).toEqual([]);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.total).toBe(0);
      expect(result.current.error).toBe(null);
    });

    it('handles search errors', async () => {
      const mockError = new Error('Search failed');
      mockSpotifyService.searchTracks.mockRejectedValue(mockError);

      const { result } = renderHook(() => useSpotifySearch(mockAccessToken));

      act(() => {
        result.current.setQuery('test query');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.error).toBe(mockError);
      });
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('sets loading state during search', async () => {
      mockSpotifyService.searchTracks.mockResolvedValue(mockSearchResults);

      const { result } = renderHook(() => useSpotifySearch(mockAccessToken));

      act(() => {
        result.current.setQuery('test query');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('Manual search', () => {
    const mockSearchResults = {
      tracks: [{ id: '1', name: 'Track 1' }],
      total: 1,
      hasMore: false,
    };

    it('performs manual search', async () => {
      mockSpotifyService.searchTracks.mockResolvedValue(mockSearchResults);

      const { result } = renderHook(() =>
        useSpotifySearch(mockAccessToken, { autoSearch: false })
      );

      await act(async () => {
        result.current.search('manual query');
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(mockSpotifyService.searchTracks).toHaveBeenCalledWith(
          'manual query',
          expect.any(Object)
        );
      });

      expect(result.current.query).toBe('manual query');
      expect(result.current.results).toEqual(mockSearchResults.tracks);
    });

    it('resets pagination for new manual search', async () => {
      mockSpotifyService.searchTracks.mockResolvedValue(mockSearchResults);

      const { result } = renderHook(() => useSpotifySearch(mockAccessToken));

      // Set some offset first
      await act(async () => {
        result.current.setQuery('test');
        jest.advanceTimersByTime(300);
      });

      await act(async () => {
        result.current.search('new query');
      });

      await waitFor(() => {
        expect(mockSpotifyService.searchTracks).toHaveBeenCalledWith(
          'new query',
          {
            limit: 20,
            offset: 0,
            market: undefined,
          }
        );
      });
    });
  });

  describe('Pagination', () => {
    const mockFirstPage = {
      tracks: [{ id: '1', name: 'Track 1' }],
      total: 50,
      hasMore: true,
    };

    const mockSecondPage = {
      tracks: [{ id: '2', name: 'Track 2' }],
      total: 50,
      hasMore: false,
    };

    it('loads more results', async () => {
      mockSpotifyService.searchTracks
        .mockResolvedValueOnce(mockFirstPage)
        .mockResolvedValueOnce(mockSecondPage);

      const { result } = renderHook(() => useSpotifySearch(mockAccessToken));

      // Initial search
      act(() => {
        result.current.setQuery('test');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.results).toHaveLength(1);
      });

      expect(result.current.hasMore).toBe(true);

      // Load more
      await act(async () => {
        result.current.loadMore();
      });

      expect(mockSpotifyService.searchTracks).toHaveBeenCalledTimes(2);
      expect(mockSpotifyService.searchTracks).toHaveBeenLastCalledWith('test', {
        limit: 20,
        offset: 1,
        market: undefined,
      });

      expect(result.current.results).toHaveLength(2);
      expect(result.current.hasMore).toBe(false);
    });

    it('does not load more when already loading', async () => {
      const searchPromise = new Promise(() => {});
      mockSpotifyService.searchTracks.mockReturnValue(searchPromise);

      const { result } = renderHook(() => useSpotifySearch(mockAccessToken));

      act(() => {
        result.current.setQuery('test');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      // Try to load more while loading
      act(() => {
        result.current.loadMore();
      });

      expect(mockSpotifyService.searchTracks).toHaveBeenCalledTimes(1);
    });

    it('does not load more when hasMore is false', async () => {
      mockSpotifyService.searchTracks.mockResolvedValue({
        tracks: [{ id: '1', name: 'Track 1' }],
        hasMore: false,
      });

      const { result } = renderHook(() => useSpotifySearch(mockAccessToken));

      act(() => {
        result.current.setQuery('test');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.hasMore).toBe(false);
      });

      act(() => {
        result.current.loadMore();
      });

      expect(mockSpotifyService.searchTracks).toHaveBeenCalledTimes(1);
    });
  });

  describe('Utility methods', () => {
    it('clears search results and state', () => {
      const { result } = renderHook(() => useSpotifySearch(mockAccessToken));

      // Set some state first
      act(() => {
        result.current.setQuery('test');
      });

      act(() => {
        result.current.clear();
      });

      expect(result.current.query).toBe('');
      expect(result.current.results).toEqual([]);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.total).toBe(0);
      expect(result.current.error).toBe(null);
    });

    it('retries last search', async () => {
      mockSpotifyService.searchTracks.mockResolvedValue({
        tracks: [{ id: '1', name: 'Track 1' }],
        hasMore: false,
      });

      const { result } = renderHook(() => useSpotifySearch(mockAccessToken));

      act(() => {
        result.current.setQuery('test query');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockSpotifyService.searchTracks).toHaveBeenCalledTimes(1);
      });

      await act(async () => {
        result.current.retry();
      });

      expect(mockSpotifyService.searchTracks).toHaveBeenCalledTimes(2);
      expect(mockSpotifyService.searchTracks).toHaveBeenLastCalledWith(
        'test query',
        expect.any(Object)
      );
    });
  });

  describe('Options', () => {
    it('respects custom debounce delay', async () => {
      mockSpotifyService.searchTracks.mockResolvedValue({
        tracks: [],
        hasMore: false,
      });

      const { result } = renderHook(() =>
        useSpotifySearch(mockAccessToken, { debounceMs: 500 })
      );

      act(() => {
        result.current.setQuery('test');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(mockSpotifyService.searchTracks).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(mockSpotifyService.searchTracks).toHaveBeenCalled();
      });
    });

    it('respects autoSearch: false', () => {
      const { result } = renderHook(() =>
        useSpotifySearch(mockAccessToken, { autoSearch: false })
      );

      act(() => {
        result.current.setQuery('test');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(mockSpotifyService.searchTracks).not.toHaveBeenCalled();
    });

    it('passes market option to search', async () => {
      mockSpotifyService.searchTracks.mockResolvedValue({
        tracks: [],
        hasMore: false,
      });

      const { result } = renderHook(() =>
        useSpotifySearch(mockAccessToken, { market: 'US' })
      );

      act(() => {
        result.current.setQuery('test');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockSpotifyService.searchTracks).toHaveBeenCalledWith('test', {
          limit: 20,
          offset: 0,
          market: 'US',
        });
      });
    });
  });

  describe('Computed values', () => {
    it('calculates isEmpty correctly', () => {
      const { result } = renderHook(() => useSpotifySearch(mockAccessToken));

      expect(result.current.isEmpty).toBe(true);

      act(() => {
        result.current.setQuery('test');
      });

      // Still empty while loading
      expect(result.current.isEmpty).toBe(true);
    });

    it('calculates isInitialLoad correctly', async () => {
      const searchPromise = new Promise(resolve => {});
      mockSpotifyService.searchTracks.mockReturnValue(searchPromise);

      const { result } = renderHook(() => useSpotifySearch(mockAccessToken));

      act(() => {
        result.current.setQuery('test');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.isInitialLoad).toBe(true);
      });

      expect(result.current.isLoadingMore).toBe(false);
    });
  });
});
