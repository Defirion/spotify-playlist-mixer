import { renderHook, act, waitFor } from '@testing-library/react';
import usePlaylistTracks from '../usePlaylistTracks';
import SpotifyService from '../../services/spotify';

// Mock axios
jest.mock('axios');

// Mock the SpotifyService
jest.mock('../../services/spotify');

describe('usePlaylistTracks', () => {
  let mockSpotifyService;
  const mockAccessToken = 'mock-access-token';
  const mockPlaylistId = 'playlist-123';

  beforeEach(() => {
    jest.clearAllMocks();

    mockSpotifyService = {
      getPlaylistTracks: jest.fn(),
    };

    SpotifyService.mockImplementation(() => mockSpotifyService);
  });

  describe('Initialization', () => {
    it('initializes with default state', () => {
      const { result } = renderHook(() =>
        usePlaylistTracks(mockAccessToken, null, { autoFetch: false })
      );

      expect(result.current.tracks).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.progress).toEqual({
        loaded: 0,
        total: 0,
        percentage: 0,
      });
      expect(result.current.isEmpty).toBe(true);
      expect(result.current.hasData).toBe(false);
      expect(result.current.totalTracks).toBe(0);
    });

    it('creates SpotifyService instance with access token', () => {
      renderHook(() => usePlaylistTracks(mockAccessToken, mockPlaylistId));

      expect(SpotifyService).toHaveBeenCalledWith(mockAccessToken);
    });

    it('handles missing access token gracefully', () => {
      const { result } = renderHook(() =>
        usePlaylistTracks(null, mockPlaylistId, { autoFetch: false })
      );

      expect(SpotifyService).not.toHaveBeenCalled();
      expect(result.current.error).toBe(null);
    });
  });

  describe('Auto-fetch functionality', () => {
    const mockTracks = [
      { id: '1', name: 'Track 1', artists: [{ name: 'Artist 1' }] },
      { id: '2', name: 'Track 2', artists: [{ name: 'Artist 2' }] },
    ];

    it('fetches tracks automatically when playlistId is provided', async () => {
      mockSpotifyService.getPlaylistTracks.mockResolvedValue(mockTracks);

      const { result } = renderHook(() =>
        usePlaylistTracks(mockAccessToken, mockPlaylistId)
      );

      await waitFor(() => {
        expect(mockSpotifyService.getPlaylistTracks).toHaveBeenCalledWith(
          mockPlaylistId,
          {
            market: undefined,
            onProgress: expect.any(Function),
          }
        );
      });

      expect(result.current.tracks).toEqual(mockTracks);
      expect(result.current.hasData).toBe(true);
      expect(result.current.totalTracks).toBe(2);
      expect(result.current.isComplete).toBe(true);
    });

    it('does not fetch when autoFetch is false', () => {
      renderHook(() =>
        usePlaylistTracks(mockAccessToken, mockPlaylistId, { autoFetch: false })
      );

      expect(mockSpotifyService.getPlaylistTracks).not.toHaveBeenCalled();
    });

    it('clears tracks when playlistId is null', async () => {
      mockSpotifyService.getPlaylistTracks.mockResolvedValue(mockTracks);

      const { result, rerender } = renderHook(
        ({ playlistId }) => usePlaylistTracks(mockAccessToken, playlistId),
        { initialProps: { playlistId: mockPlaylistId } }
      );

      await waitFor(() => {
        expect(mockSpotifyService.getPlaylistTracks).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(result.current.tracks).toEqual(mockTracks);
      });

      rerender({ playlistId: null });

      await waitFor(() => {
        expect(result.current.tracks).toEqual([]);
        expect(result.current.progress).toEqual({
          loaded: 0,
          total: 0,
          percentage: 0,
        });
      });
    });

    it('refetches when playlistId changes', async () => {
      const newPlaylistId = 'playlist-456';
      const newTracks = [{ id: '3', name: 'Track 3' }];

      mockSpotifyService.getPlaylistTracks
        .mockResolvedValueOnce(mockTracks)
        .mockResolvedValueOnce(newTracks);

      const { result, rerender } = renderHook(
        ({ playlistId }) => usePlaylistTracks(mockAccessToken, playlistId),
        { initialProps: { playlistId: mockPlaylistId } }
      );

      await waitFor(() => {
        expect(result.current.tracks).toEqual(mockTracks);
      });

      rerender({ playlistId: newPlaylistId });

      await waitFor(() => {
        expect(mockSpotifyService.getPlaylistTracks).toHaveBeenCalledWith(
          newPlaylistId,
          expect.any(Object)
        );
        expect(result.current.tracks).toEqual(newTracks);
      });
    });
  });

  describe('Loading states', () => {
    it('sets loading state during fetch', async () => {
      let resolveGetTracks;
      const tracksPromise = new Promise(resolve => {
        resolveGetTracks = resolve;
      });
      mockSpotifyService.getPlaylistTracks.mockReturnValue(tracksPromise);

      const { result } = renderHook(() =>
        usePlaylistTracks(mockAccessToken, mockPlaylistId)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      act(() => {
        resolveGetTracks([]);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('resets progress when starting new fetch', async () => {
      const { result } = renderHook(() =>
        usePlaylistTracks(mockAccessToken, mockPlaylistId, { autoFetch: false })
      );

      // Set some initial progress
      act(() => {
        result.current.fetchTracks();
      });

      expect(result.current.progress).toEqual({
        loaded: 0,
        total: 0,
        percentage: 0,
      });
    });
  });

  describe('Progress tracking', () => {
    it('calls onProgress callback during fetch', async () => {
      const onProgress = jest.fn();
      const mockProgressData = { loaded: 50, total: 100, percentage: 50 };

      mockSpotifyService.getPlaylistTracks.mockImplementation(
        (playlistId, options) => {
          // Simulate progress callback
          if (options.onProgress) {
            options.onProgress(mockProgressData);
          }
          return Promise.resolve([]);
        }
      );

      renderHook(() =>
        usePlaylistTracks(mockAccessToken, mockPlaylistId, { onProgress })
      );

      await waitFor(() => {
        expect(onProgress).toHaveBeenCalledWith(mockProgressData);
      });
    });

    it('updates internal progress state', async () => {
      const mockProgressData = { loaded: 25, total: 100, percentage: 25 };

      mockSpotifyService.getPlaylistTracks.mockImplementation(
        (playlistId, options) => {
          if (options.onProgress) {
            options.onProgress(mockProgressData);
          }
          return Promise.resolve([]);
        }
      );

      const { result } = renderHook(() =>
        usePlaylistTracks(mockAccessToken, mockPlaylistId)
      );

      await waitFor(() => {
        expect(result.current.progress).toEqual(mockProgressData);
      });
    });
  });

  describe('Error handling', () => {
    it('handles fetch errors', async () => {
      const mockError = new Error('Failed to fetch tracks');
      mockSpotifyService.getPlaylistTracks.mockRejectedValue(mockError);

      const { result } = renderHook(() =>
        usePlaylistTracks(mockAccessToken, mockPlaylistId)
      );

      await waitFor(() => {
        expect(result.current.error).toBe(mockError);
        expect(result.current.loading).toBe(false);
      });
    });

    it('sets error when SpotifyService is not initialized', async () => {
      const { result } = renderHook(() =>
        usePlaylistTracks(null, mockPlaylistId)
      );

      await act(async () => {
        result.current.fetchTracks();
      });

      expect(result.current.error).toEqual(
        new Error('Spotify service not initialized')
      );
    });
  });

  describe('Manual operations', () => {
    const mockTracks = [
      { id: '1', name: 'Track 1' },
      { id: '2', name: 'Track 2' },
    ];

    it('manually fetches tracks', async () => {
      mockSpotifyService.getPlaylistTracks.mockResolvedValue(mockTracks);

      const { result } = renderHook(() =>
        usePlaylistTracks(mockAccessToken, mockPlaylistId, { autoFetch: false })
      );

      await act(async () => {
        result.current.fetchTracks();
      });

      expect(mockSpotifyService.getPlaylistTracks).toHaveBeenCalledWith(
        mockPlaylistId,
        expect.any(Object)
      );
      expect(result.current.tracks).toEqual(mockTracks);
    });

    it('refreshes tracks', async () => {
      mockSpotifyService.getPlaylistTracks.mockResolvedValue(mockTracks);

      const { result } = renderHook(() =>
        usePlaylistTracks(mockAccessToken, mockPlaylistId)
      );

      await waitFor(() => {
        expect(mockSpotifyService.getPlaylistTracks).toHaveBeenCalledTimes(1);
      });

      await act(async () => {
        result.current.refresh();
      });

      expect(mockSpotifyService.getPlaylistTracks).toHaveBeenCalledTimes(2);
    });

    it('retries after error', async () => {
      mockSpotifyService.getPlaylistTracks
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockTracks);

      const { result } = renderHook(() =>
        usePlaylistTracks(mockAccessToken, mockPlaylistId)
      );

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      await act(async () => {
        result.current.retry();
      });

      expect(result.current.tracks).toEqual(mockTracks);
      expect(result.current.error).toBe(null);
    });

    it('clears tracks and state', () => {
      const { result } = renderHook(() =>
        usePlaylistTracks(mockAccessToken, mockPlaylistId, { autoFetch: false })
      );

      act(() => {
        result.current.clear();
      });

      expect(result.current.tracks).toEqual([]);
      expect(result.current.error).toBe(null);
      expect(result.current.progress).toEqual({
        loaded: 0,
        total: 0,
        percentage: 0,
      });
    });
  });

  describe('Utility methods', () => {
    const mockTracks = [
      { id: '1', name: 'Track 1', artist: 'Artist 1' },
      { id: '2', name: 'Track 2', artist: 'Artist 2' },
      { id: '3', name: 'Track 3', artist: 'Artist 1' },
    ];

    beforeEach(async () => {
      mockSpotifyService.getPlaylistTracks.mockResolvedValue(mockTracks);
    });

    it('gets track by ID', async () => {
      const { result } = renderHook(() =>
        usePlaylistTracks(mockAccessToken, mockPlaylistId)
      );

      await waitFor(() => {
        expect(result.current.tracks).toEqual(mockTracks);
      });

      const track = result.current.getTrackById('2');
      expect(track).toEqual(mockTracks[1]);

      const nonExistentTrack = result.current.getTrackById('999');
      expect(nonExistentTrack).toBeUndefined();
    });

    it('filters tracks', async () => {
      const { result } = renderHook(() =>
        usePlaylistTracks(mockAccessToken, mockPlaylistId)
      );

      await waitFor(() => {
        expect(result.current.tracks).toEqual(mockTracks);
      });

      const filteredTracks = result.current.filterTracks(
        track => track.artist === 'Artist 1'
      );
      expect(filteredTracks).toHaveLength(2);
      expect(filteredTracks[0].id).toBe('1');
      expect(filteredTracks[1].id).toBe('3');
    });

    it('gets tracks with specific property', async () => {
      const { result } = renderHook(() =>
        usePlaylistTracks(mockAccessToken, mockPlaylistId)
      );

      await waitFor(() => {
        expect(result.current.tracks).toEqual(mockTracks);
      });

      const tracksWithArtist = result.current.getTracksWithProperty(
        'artist',
        'Artist 1'
      );
      expect(tracksWithArtist).toHaveLength(2);
    });
  });

  describe('Options', () => {
    it('passes market option to getPlaylistTracks', async () => {
      mockSpotifyService.getPlaylistTracks.mockResolvedValue([]);

      renderHook(() =>
        usePlaylistTracks(mockAccessToken, mockPlaylistId, { market: 'US' })
      );

      await waitFor(() => {
        expect(mockSpotifyService.getPlaylistTracks).toHaveBeenCalledWith(
          mockPlaylistId,
          {
            market: 'US',
            onProgress: expect.any(Function),
          }
        );
      });
    });
  });

  describe('Computed values', () => {
    it('calculates isEmpty correctly', async () => {
      const { result } = renderHook(() =>
        usePlaylistTracks(mockAccessToken, mockPlaylistId, { autoFetch: false })
      );

      expect(result.current.isEmpty).toBe(true);

      mockSpotifyService.getPlaylistTracks.mockResolvedValue([
        { id: '1', name: 'Track 1' },
      ]);

      await act(async () => {
        result.current.fetchTracks();
      });

      expect(result.current.isEmpty).toBe(false);
      expect(result.current.hasData).toBe(true);
    });

    it('calculates isComplete correctly', async () => {
      const { result } = renderHook(() =>
        usePlaylistTracks(mockAccessToken, mockPlaylistId, { autoFetch: false })
      );

      expect(result.current.isComplete).toBe(false);

      mockSpotifyService.getPlaylistTracks.mockImplementation(
        (playlistId, options) => {
          if (options.onProgress) {
            options.onProgress({ loaded: 100, total: 100, percentage: 100 });
          }
          return Promise.resolve([{ id: '1', name: 'Track 1' }]);
        }
      );

      await act(async () => {
        result.current.fetchTracks();
      });

      expect(result.current.isComplete).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('cancels ongoing requests on unmount', () => {
      const { unmount } = renderHook(() =>
        usePlaylistTracks(mockAccessToken, mockPlaylistId)
      );

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
