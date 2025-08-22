import React from 'react';
import { act } from '@testing-library/react';

const mockMixPlaylists = jest.fn();
jest.mock('../../utils/mixer', () => ({
  mixPlaylists: (...args: any[]) => mockMixPlaylists(...args),
}));

const mockGetPlaylistTracks = jest.fn();
class MockSpotifyService {
  accessToken: string;
  constructor(token: string) {
    this.accessToken = token;
  }
  getPlaylistTracks(...args: any[]) {
    return mockGetPlaylistTracks(...args);
  }
}
jest.mock('../../services/spotify', () => ({
  __esModule: true,
  default: MockSpotifyService,
}));

const loadHook = () => jest.requireActual('../../hooks/useMixPreview');

function renderUseMixPreview(accessToken: string, options: any = {}) {
  const results: any = {};
  function TestComp() {
    const { useMixPreview } = loadHook();
    const hookReturn = useMixPreview(accessToken, options);
    Object.assign(results, hookReturn);
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { render } = require('@testing-library/react');
  render(<TestComp />);
  return results as ReturnType<ReturnType<typeof loadHook>['useMixPreview']>;
}

const makePlaylist = (id: string, name = id) => ({
  id,
  name,
  tracks: { total: 0 },
});
const makeTrack = (id: string, sourcePlaylist: string, duration = 60000) => ({
  id,
  uri: `spotify:track:${id}`,
  name: `Track ${id}`,
  duration_ms: duration,
  sourcePlaylist,
});

describe('useMixPreview (extra cases)', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPlaylistTracks.mockImplementation(async (pid: string) => ({
      tracks: pid === 'p1' ? [makeTrack('t1', 'p1')] : [makeTrack('t2', 'p2')],
    }));
    // silence console.error from the hook implementation during passing runs
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy?.mockRestore?.();
  });

  test('handles object-form mixer result and recalculates stats', async () => {
    mockMixPlaylists.mockReturnValue({
      tracks: [makeTrack('a', 'p1'), makeTrack('b', 'p2')],
      exhaustedPlaylists: [],
      stoppedEarly: false,
    });
    const utils = renderUseMixPreview('token');
    await act(async () => {
      await utils.generatePreview(
        [makePlaylist('p1'), makePlaylist('p2')] as any,
        {},
        {}
      );
    });
    expect(utils.state.preview).not.toBeNull();
    expect(utils.state.preview.tracks.length).toBe(2);
  });

  test('spotify track fetch failure sets error and calls onError', async () => {
    // Simulate spotify service throwing when fetching playlist tracks
    mockGetPlaylistTracks.mockImplementationOnce(async () => {
      throw new Error('playlist fetch failed');
    });

    mockMixPlaylists.mockReturnValue([makeTrack('a', 'p1')]);
    const onError = jest.fn();
    const utils = renderUseMixPreview('token', { onError });
    await act(async () => {
      await utils.generatePreview(
        [makePlaylist('p1'), makePlaylist('p2')] as any,
        {},
        {}
      );
    });

    expect(utils.state.error).toBeTruthy();
    expect(onError).toHaveBeenCalled();
  });

  test('missing spotify service sets error and calls onError', async () => {
    const onError = jest.fn();
    const utils = renderUseMixPreview('', { onError });

    await act(async () => {
      await utils.generatePreview([makePlaylist('p1')] as any, {}, {});
    });

    expect(utils.state.error).toBe('Spotify service not available');
    expect(onError).toHaveBeenCalledWith('Spotify service not available');
  });

  test('handles null mixResult gracefully', async () => {
    mockMixPlaylists.mockReturnValue(null);
    const utils = renderUseMixPreview('token');

    await act(async () => {
      await utils.generatePreview([makePlaylist('p1')] as any, {}, {
        popularityStrategy: 'x',
      } as any);
    });

    expect(utils.state.preview).not.toBeNull();
    expect(utils.state.preview!.tracks.length).toBe(0);
  });

  test('object mixResult with non-array tracks preserves exhausted/stopped flags', async () => {
    mockMixPlaylists.mockReturnValue({
      tracks: 'not-an-array',
      exhaustedPlaylists: ['p1'],
      stoppedEarly: true,
    });

    const utils = renderUseMixPreview('token');

    await act(async () => {
      await utils.generatePreview([makePlaylist('p1')] as any, {}, {
        popularityStrategy: 'x',
      } as any);
    });

    expect(utils.state.preview).not.toBeNull();
    expect(utils.state.preview!.tracks.length).toBe(0);
    expect(utils.state.preview!.exhaustedPlaylists).toEqual(['p1']);
    expect(utils.state.preview!.stoppedEarly).toBe(true);
  });

  test('updateTrackOrder sets custom order and getPreviewTracks returns it', async () => {
    mockMixPlaylists.mockReturnValue([
      makeTrack('a', 'p1', 60000),
      makeTrack('b', 'p2', 60000),
    ]);
    const utils = renderUseMixPreview('token');

    await act(async () => {
      await utils.generatePreview(
        [makePlaylist('p1'), makePlaylist('p2')] as any,
        {},
        { popularityStrategy: 'pop' } as any
      );
    });

    const reordered = [...utils.state.preview!.tracks].reverse();

    act(() => {
      utils.updateTrackOrder(reordered);
    });

    expect(utils.state.customTrackOrder).toEqual(reordered);
    expect(utils.getPreviewTracks()).toEqual(reordered);
  });

  test('calculates search tracks stats when search tracks present', async () => {
    // Make tracks with search sourcePlaylist to trigger lines 108-112
    const searchTrack = { ...makeTrack('search1', 'search', 60000) };
    mockMixPlaylists.mockReturnValue([
      makeTrack('a', 'p1', 60000),
      searchTrack,
    ]);
    const utils = renderUseMixPreview('token');

    await act(async () => {
      await utils.generatePreview([makePlaylist('p1')] as any, {}, {
        popularityStrategy: 'pop',
      } as any);
    });

    // Should include search stats
    expect(utils.state.preview!.stats['search']).toBeDefined();
    expect(utils.state.preview!.stats['search'].name).toBe('🔍 Spotify Search');
    expect(utils.state.preview!.stats['search'].count).toBe(1);
  });

  test('handles non-array and non-object mixResult types', async () => {
    // Return a string instead of array/object to trigger lines 182-187
    mockMixPlaylists.mockReturnValue('invalid-type' as any);
    const utils = renderUseMixPreview('token');

    await act(async () => {
      await utils.generatePreview([makePlaylist('p1')] as any, {}, {
        popularityStrategy: 'pop',
      } as any);
    });

    // Should result in empty tracks due to error handling
    expect(utils.state.preview!.tracks).toEqual([]);
  });

  test('updateTrackOrder recalculates search stats when search tracks present', async () => {
    // Setup with search track to trigger lines 262-266 in updateTrackOrder
    const searchTrack = { ...makeTrack('search1', 'search', 60000) };
    mockMixPlaylists.mockReturnValue([
      makeTrack('a', 'p1', 60000),
      searchTrack,
    ]);
    const utils = renderUseMixPreview('token');

    await act(async () => {
      await utils.generatePreview([makePlaylist('p1')] as any, {}, {
        popularityStrategy: 'pop',
      } as any);
    });

    const reordered = [...utils.state.preview!.tracks].reverse();

    act(() => {
      utils.updateTrackOrder(reordered);
    });

    // Verify search stats were recalculated in updateTrackOrder
    expect(utils.state.preview!.stats['search']).toBeDefined();
    expect(utils.state.preview!.stats['search'].count).toBe(1);
  });

  test('clearPreview resets all state', async () => {
    // Setup some preview state first
    mockMixPlaylists.mockReturnValue([makeTrack('a', 'p1', 60000)]);
    const utils = renderUseMixPreview('token');

    await act(async () => {
      await utils.generatePreview([makePlaylist('p1')] as any, {}, {
        popularityStrategy: 'pop',
      } as any);
    });

    // Verify preview exists
    expect(utils.state.preview).not.toBeNull();

    // Clear preview to trigger line 296
    act(() => {
      utils.clearPreview();
    });

    expect(utils.state.preview).toBeNull();
    expect(utils.state.customTrackOrder).toBeNull();
    expect(utils.state.error).toBeNull();
  });

  test('getPreviewTracks returns original tracks when no custom order', async () => {
    // Test line 309 - when customTrackOrder is null or empty
    mockMixPlaylists.mockReturnValue([
      makeTrack('a', 'p1', 60000),
      makeTrack('b', 'p2', 60000),
    ]);
    const utils = renderUseMixPreview('token');

    await act(async () => {
      await utils.generatePreview(
        [makePlaylist('p1'), makePlaylist('p2')] as any,
        {},
        { popularityStrategy: 'pop' } as any
      );
    });

    // Test without custom order
    const originalTracks = utils.state.preview!.tracks;
    expect(utils.getPreviewTracks()).toEqual(originalTracks);

    // Now set custom order and verify it's used instead
    const customOrder = [...originalTracks].reverse();
    act(() => {
      utils.updateTrackOrder(customOrder);
    });

    // Should now return custom order
    expect(utils.getPreviewTracks()).toEqual(customOrder);
    expect(utils.getPreviewTracks()).not.toEqual(originalTracks);
  });

  test('handles edge case where previewTracks becomes non-array after processing', async () => {
    // Create an object that has a tracks property that's not an array
    // This should trigger the final safety check on lines 192-193
    mockMixPlaylists.mockReturnValue({
      tracks: null, // This will cause previewTracks to be null
      exhaustedPlaylists: [],
      stoppedEarly: false,
    });
    const utils = renderUseMixPreview('token');

    await act(async () => {
      await utils.generatePreview([makePlaylist('p1')] as any, {}, {
        popularityStrategy: 'pop',
      } as any);
    });

    // Should result in empty array due to safety check
    expect(utils.state.preview!.tracks).toEqual([]);
  });

  test('handles missing onError callback in error scenarios', async () => {
    // Test the branch where onError is not provided but error occurs
    mockGetPlaylistTracks.mockImplementationOnce(async () => {
      throw new Error('playlist fetch failed');
    });

    // Don't provide onError callback to test the conditional
    const utils = renderUseMixPreview('token'); // No onError option

    await act(async () => {
      await utils.generatePreview([makePlaylist('p1')] as any, {}, {
        popularityStrategy: 'pop',
      } as any);
    });

    // Should set error state even without onError callback
    expect(utils.state.error).toBeTruthy();
  });

  test('handles empty accessToken case', () => {
    // Test the else branch in useEffect when accessToken is falsy
    const utils = renderUseMixPreview(''); // Empty accessToken

    // Should not throw and handle gracefully
    expect(utils.state.error).toBeNull();
    expect(utils.state.preview).toBeNull();
  });

  test('covers error case without onError callback', async () => {
    // Test missing spotify service without onError callback
    const utils = renderUseMixPreview(''); // No accessToken

    await act(async () => {
      await utils.generatePreview([makePlaylist('p1')] as any, {}, {});
    });

    // Should set error state
    expect(utils.state.error).toBe('Spotify service not available');
  });

  test('covers updateTrackOrder with no existing preview', () => {
    // Test the early return when no preview exists
    const utils = renderUseMixPreview('token');

    // Try to update track order without any preview
    act(() => {
      utils.updateTrackOrder([makeTrack('test', 'p1')]);
    });

    // Should remain unchanged
    expect(utils.state.preview).toBeNull();
    expect(utils.state.customTrackOrder).toBeNull();
  });
});
