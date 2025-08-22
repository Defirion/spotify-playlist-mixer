import { renderHook, waitFor, act } from '@testing-library/react';
import { usePlaylistSearch } from '../usePlaylistSearch';

// Mock the spotify utils
jest.mock('../../utils/spotify', () => ({
  getSpotifyApi: jest.fn(),
}));

const { getSpotifyApi } = require('../../utils/spotify');

describe('usePlaylistSearch Edge Cases and Error Handling', () => {
  let consoleDebugSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment for each test
    delete process.env.NODE_ENV;
    delete process.env.TEST_VERBOSE;

    // Per-suite suppression of noisy logs during passing runs
    // Tests that need to assert on console.error may still create their own spies
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('handles missing accessToken', async () => {
    const mockGet = jest.fn();
    (getSpotifyApi as jest.Mock).mockReturnValue({ get: mockGet });

    const { result } = renderHook(() =>
      usePlaylistSearch({ accessToken: null })
    );

    result.current.setQuery('test query');

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.results).toEqual([]);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('handles empty query strings', async () => {
    const mockGet = jest.fn();
    (getSpotifyApi as jest.Mock).mockReturnValue({ get: mockGet });

    const { result } = renderHook(() =>
      usePlaylistSearch({ accessToken: 'token' })
    );

    result.current.setQuery('   '); // whitespace only

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.results).toEqual([]);
    expect(result.current.showResults).toBe(false);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('detects and ignores Spotify URLs', async () => {
    const mockGet = jest.fn();
    (getSpotifyApi as jest.Mock).mockReturnValue({ get: mockGet });

    const { result } = renderHook(() =>
      usePlaylistSearch({ accessToken: 'token' })
    );

    const spotifyUrls = [
      'https://open.spotify.com/playlist/123',
      'https://spotify.com/playlist/123',
      'https://open.spotify.com/track/123?si=abc',
      'spotify:playlist:123',
      'spotify:track:123',
      'spotify:album:123',
    ];

    for (const url of spotifyUrls) {
      result.current.setQuery(url);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.results).toEqual([]);
      expect(result.current.showResults).toBe(false);
    }

    expect(mockGet).not.toHaveBeenCalled();
  });

  it('handles API response with tracks instead of playlists', async () => {
    const mockTracksResponse = {
      data: {
        tracks: {
          items: [
            { id: 'track1', name: 'Track 1' },
            { id: 'track2', name: 'Track 2' },
          ],
        },
      },
    };

    const mockGet = jest.fn().mockResolvedValue(mockTracksResponse);
    (getSpotifyApi as jest.Mock).mockReturnValue({ get: mockGet });

    const { result } = renderHook(() =>
      usePlaylistSearch({ accessToken: 'token' })
    );

    result.current.setQuery('test query');

    await waitFor(() => {
      expect(result.current.results).toHaveLength(2);
    });

    expect(result.current.results[0].id).toBe('track1');
    expect(result.current.showResults).toBe(true);
  });

  it('handles unexpected API response shape', async () => {
    const mockBadResponse = {
      data: {
        unexpected: 'structure',
      },
    };

    const mockGet = jest.fn().mockResolvedValue(mockBadResponse);
    (getSpotifyApi as jest.Mock).mockReturnValue({ get: mockGet });

    const { result } = renderHook(() =>
      usePlaylistSearch({ accessToken: 'token', debounceMs: 10 })
    );

    act(() => {
      result.current.setQuery('test query');
    });

    // Wait for debounce and API call to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Wait a bit more to ensure all state updates are processed
    await waitFor(() => {
      expect(result.current.showResults).toBe(true);
    });

    expect(result.current.results).toEqual([]);
  });

  it('handles request abortion', async () => {
    let resolveFirstRequest: (value: any) => void;
    let resolveSecondRequest: (value: any) => void;

    const firstRequestPromise = new Promise(resolve => {
      resolveFirstRequest = resolve;
    });

    const secondRequestPromise = new Promise(resolve => {
      resolveSecondRequest = resolve;
    });

    const mockGet = jest
      .fn()
      .mockReturnValueOnce(firstRequestPromise)
      .mockReturnValueOnce(secondRequestPromise);

    (getSpotifyApi as jest.Mock).mockReturnValue({ get: mockGet });

    const { result } = renderHook(() =>
      usePlaylistSearch({ accessToken: 'token', debounceMs: 10 })
    );

    // Start first request
    act(() => {
      result.current.setQuery('first query');
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    // Start second request before first completes - this should abort the first
    act(() => {
      result.current.setQuery('second query');
    });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledTimes(2);
    });

    // Resolve the first request (which should be ignored due to abortion)
    resolveFirstRequest!({
      data: {
        playlists: {
          items: [{ id: 'old-result', name: 'Old Result' }],
        },
      },
    });

    // The component should handle abort correctly and still be loading second request
    expect(result.current.loading).toBe(true);

    // Resolve second request to clean up
    resolveSecondRequest!({
      data: {
        playlists: {
          items: [{ id: 'new-result', name: 'New Result' }],
        },
      },
    });
  });

  it('works correctly in development mode', async () => {
    // Test that the hook functions correctly in development mode
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const mockGet = jest.fn().mockResolvedValue({
      data: { playlists: { items: [{ id: 'test', name: 'Test Playlist' }] } },
    });
    const mockApi = {
      get: mockGet,
      defaults: {
        headers: {
          Authorization: 'Bearer token123',
        },
      },
    };
    (getSpotifyApi as jest.Mock).mockReturnValue(mockApi);

    const { result } = renderHook(() =>
      usePlaylistSearch({
        accessToken: 'long-access-token-12345',
        debounceMs: 10,
      })
    );

    act(() => {
      result.current.setQuery('test query');
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Wait for results to be set
    await waitFor(() => {
      expect(result.current.results).toHaveLength(1);
    });

    expect(result.current.results[0].name).toBe('Test Playlist');
    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining('/search?q=test%20query')
    );

    process.env.NODE_ENV = originalNodeEnv;
  });

  it('includes detailed error logging in development mode', async () => {
    process.env.NODE_ENV = 'development';
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const mockError = {
      response: {
        status: 403,
        data: { error: 'Forbidden' },
        headers: { 'content-type': 'application/json' },
      },
    };

    const mockGet = jest.fn().mockRejectedValue(mockError);
    (getSpotifyApi as jest.Mock).mockReturnValue({ get: mockGet });

    const { result } = renderHook(() =>
      usePlaylistSearch({ accessToken: 'token' })
    );

    result.current.setQuery('test query');

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'DEBUG (usePlaylistSearch): request failed',
      expect.objectContaining({
        status: 403,
        responseData: { error: 'Forbidden' },
      })
    );

    consoleErrorSpy.mockRestore();
  });

  it('includes verbose error logging when TEST_VERBOSE is set', async () => {
    process.env.TEST_VERBOSE = 'true';
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const mockError = {
      response: {
        status: 500,
        data: { error: 'Internal Server Error' },
      },
    };

    const mockGet = jest.fn().mockRejectedValue(mockError);
    (getSpotifyApi as jest.Mock).mockReturnValue({ get: mockGet });

    const { result } = renderHook(() =>
      usePlaylistSearch({ accessToken: 'token' })
    );

    result.current.setQuery('test query');

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to search playlists:',
      mockError
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Spotify API response:',
      mockError.response
    );

    consoleErrorSpy.mockRestore();
  });

  it('handles unexpected API response shapes when verbose mode is enabled', async () => {
    // Test behavior with unexpected API response shapes
    const originalTestVerbose = process.env.TEST_VERBOSE;
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.TEST_VERBOSE = '1';
    process.env.NODE_ENV = 'development';

    const mockBadResponse = {
      data: { unexpected: 'shape' },
    };

    const mockGet = jest.fn().mockResolvedValue(mockBadResponse);
    (getSpotifyApi as jest.Mock).mockReturnValue({ get: mockGet });

    const { result } = renderHook(() =>
      usePlaylistSearch({ accessToken: 'token', debounceMs: 10 })
    );

    act(() => {
      result.current.setQuery('test query');
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Wait for showResults to be set
    await waitFor(() => {
      expect(result.current.showResults).toBe(true);
    });

    // Verify the main behavior: hook gracefully handles unexpected response
    expect(result.current.results).toEqual([]);
    expect(result.current.error).toBeNull();

    process.env.TEST_VERBOSE = originalTestVerbose;
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('handles debouncing correctly', async () => {
    const mockGet = jest.fn().mockResolvedValue({
      data: { playlists: { items: [] } },
    });
    (getSpotifyApi as jest.Mock).mockReturnValue({ get: mockGet });

    const { result } = renderHook(() =>
      usePlaylistSearch({ accessToken: 'token', debounceMs: 100 })
    );

    // Rapid queries should be debounced
    result.current.setQuery('a');
    result.current.setQuery('ab');
    result.current.setQuery('abc');

    // Wait for debounce + execution
    await new Promise(resolve => setTimeout(resolve, 150));

    // Only the final query should have been executed
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('q=abc'));
  });

  it('cleans up timeouts and abort controllers on unmount', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    const mockGet = jest.fn().mockResolvedValue({
      data: { playlists: { items: [] } },
    });
    (getSpotifyApi as jest.Mock).mockReturnValue({ get: mockGet });

    const { result, unmount } = renderHook(
      () => usePlaylistSearch({ accessToken: 'token', debounceMs: 1000 }) // Long debounce
    );

    // Set a query to trigger timeout
    act(() => {
      result.current.setQuery('test');
    });

    // Unmount before debounce completes
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('clears results and error state', () => {
    const { result } = renderHook(() =>
      usePlaylistSearch({ accessToken: 'token' })
    );

    // Manually set some state to test clearing
    result.current.setQuery('test');

    result.current.clearResults();

    expect(result.current.results).toEqual([]);
    expect(result.current.showResults).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('handles custom debounce and limit options', async () => {
    const mockGet = jest.fn().mockResolvedValue({
      data: { playlists: { items: [] } },
    });
    (getSpotifyApi as jest.Mock).mockReturnValue({ get: mockGet });

    const { result } = renderHook(() =>
      usePlaylistSearch({
        accessToken: 'token',
        debounceMs: 50,
        limit: 5,
      })
    );

    result.current.setQuery('test');

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalled();
    });

    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('limit=5'));
  });

  it('handles errors without response object', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const simpleError = new Error('Network error');
    const mockGet = jest.fn().mockRejectedValue(simpleError);
    (getSpotifyApi as jest.Mock).mockReturnValue({ get: mockGet });

    const { result } = renderHook(() =>
      usePlaylistSearch({ accessToken: 'token' })
    );

    result.current.setQuery('test');

    await waitFor(() => {
      expect(result.current.error).toBe(
        'Failed to search playlists. Please try again.'
      );
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to search playlists:',
      simpleError
    );
    consoleErrorSpy.mockRestore();
  });

  it('does not set error state when request is aborted', async () => {
    const abortError = new Error('Request aborted');
    abortError.name = 'AbortError';

    const mockGet = jest.fn().mockImplementation(() => {
      const controller = new AbortController();
      controller.abort();
      return Promise.reject(abortError);
    });

    (getSpotifyApi as jest.Mock).mockReturnValue({ get: mockGet });

    const { result } = renderHook(() =>
      usePlaylistSearch({ accessToken: 'token' })
    );

    result.current.setQuery('test');

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Error should not be set for aborted requests
    expect(result.current.error).toBeNull();
  });
});
