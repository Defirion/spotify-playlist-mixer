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
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPlaylistTracks.mockImplementation(async (pid: string) => ({
      tracks: pid === 'p1' ? [makeTrack('t1', 'p1')] : [makeTrack('t2', 'p2')],
    }));
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
});
