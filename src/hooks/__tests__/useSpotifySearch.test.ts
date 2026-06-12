import { renderHook, act } from '@testing-library/react';
import useSpotifySearch from '../../hooks/useSpotifySearch';
import SpotifyService from '../../services/spotify';

vi.mock('../../services/spotify');
const MockSpotifyService = SpotifyService as unknown as import('vitest').Mock;

describe('useSpotifySearch (behavior)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('sets error when spotify service not initialized and search is called', async () => {
    const { result } = renderHook(() =>
      useSpotifySearch(null, { autoSearch: false })
    );

    await act(async () => {
      await result.current.search('q');
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.results).toEqual([]);
  });

  it('manual search updates results, total, hasMore and offset', async () => {
    let searchTracksMock = vi.fn().mockResolvedValue({
      tracks: [{ id: 't1' }],
      hasMore: true,
      total: 10,
    });

    MockSpotifyService.mockImplementation(function (this: unknown) {
      return {
        searchTracks: searchTracksMock,
      };
    });

    const { result } = renderHook(() =>
      useSpotifySearch('tok', { autoSearch: false })
    );

    await act(async () => {
      await result.current.search('hello');
    });

    expect(searchTracksMock).toHaveBeenCalled();
    expect(result.current.results.map(r => r.id)).toEqual(['t1']);
    expect(result.current.total).toBe(10);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.isInitialLoad).toBe(false);
  });

  it('loadMore appends new results when hasMore is true', async () => {
    const first = vi
      .fn()
      .mockResolvedValue({ tracks: [{ id: 'a' }], hasMore: true, total: 3 });
    const second = vi
      .fn()
      .mockResolvedValue({ tracks: [{ id: 'b' }], hasMore: false, total: 3 });

    // First instantiation returns object whose searchTracks will be first, then second
    const calls: import('vitest').Mock[] = [];
    MockSpotifyService.mockImplementation(function (this: unknown) {
      return {
        searchTracks: (...args: any[]) => {
          const fn = calls.shift();
          return fn!(...args);
        },
      };
    });
    // prime the call queue
    calls.push(first, second);

    const { result } = renderHook(() =>
      useSpotifySearch('tok', { autoSearch: false })
    );

    await act(async () => {
      await result.current.search('q');
    });

    expect(result.current.results.map(r => r.id)).toEqual(['a']);

    await act(async () => {
      result.current.loadMore();
    });

    // allow any pending promises to resolve
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.results.map(r => r.id)).toEqual(['a', 'b']);
  });

  it('clear aborts in-flight search and prevents state update after abort', async () => {
    let resolveSearch: Function | null = null;
    const searchPromise = new Promise(resolve => {
      resolveSearch = resolve;
    });

    const delayed = vi.fn().mockImplementation(function (this: unknown) {
      return searchPromise;
    });
    MockSpotifyService.mockImplementation(function (this: unknown) {
      return { searchTracks: delayed };
    });

    const { result } = renderHook(() =>
      useSpotifySearch('tok', { autoSearch: false })
    );

    // Start search but don't await resolution yet
    await act(async () => {
      const p = result.current.search('slow');
      // clear immediately which should abort
      result.current.clear();
      // resolve the underlying search afterwards
      resolveSearch!({ tracks: [{ id: 'z' }], hasMore: false, total: 1 });
      await p; // wait for search to finish
    });

    // Because the request was aborted, results should remain empty
    expect(result.current.results).toEqual([]);
  });

  it('retry triggers search when query exists', async () => {
    const searchTracksMock = vi
      .fn()
      .mockResolvedValue({ tracks: [{ id: 'r1' }], hasMore: false, total: 1 });
    MockSpotifyService.mockImplementation(function (this: unknown) {
      return {
        searchTracks: searchTracksMock,
      };
    });

    const { result } = renderHook(() =>
      useSpotifySearch('tok', { autoSearch: false })
    );

    // set a query then call retry
    await act(async () => {
      result.current.setQuery('something');
    });

    await act(async () => {
      result.current.retry();
    });

    expect(searchTracksMock).toHaveBeenCalled();
  });
});
