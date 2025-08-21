import React from 'react';
import { act } from '@testing-library/react';

// Reuse same mocking approach as the main unit tests
const mockMixPlaylists = jest.fn();
jest.mock('../../utils/mixer', () => ({
  mixPlaylists: (...args: any[]) => mockMixPlaylists(...args),
}));

const mockGetPlaylistTracks = jest.fn();
const mockGetUserProfile = jest.fn();
const mockCreatePlaylist = jest.fn();
const mockAddTracks = jest.fn();

class MockSpotifyService {
  accessToken: string;
  constructor(token: string) {
    this.accessToken = token;
  }
  getPlaylistTracks(...args: any[]) {
    return mockGetPlaylistTracks(...args);
  }
  getUserProfile(...args: any[]) {
    return mockGetUserProfile(...args);
  }
  createPlaylist(...args: any[]) {
    return mockCreatePlaylist(...args);
  }
  addTracksToPlaylist(...args: any[]) {
    return mockAddTracks(...args);
  }
}
jest.mock('../../services/spotify', () => ({
  __esModule: true,
  default: MockSpotifyService,
}));

const loadHook = () => jest.requireActual('../../hooks/useMixGeneration');

function renderUseMixGeneration(accessToken: string, options: any = {}) {
  const results: any = {};
  function TestComp() {
    const { useMixGeneration } = loadHook();
    const hookReturn = useMixGeneration(accessToken, options);
    Object.assign(results, hookReturn);
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { render } = require('@testing-library/react');
  render(<TestComp />);
  return results as ReturnType<ReturnType<typeof loadHook>['useMixGeneration']>;
}

const makePlaylist = (id: string, name = id) => ({
  id,
  name,
  tracks: { total: 0 },
});
const makeTrack = (id: string, sourcePlaylist: string, duration = 180000) => ({
  id,
  uri: `spotify:track:${id}`,
  name: `Track ${id}`,
  duration_ms: duration,
  sourcePlaylist,
});

describe('useMixGeneration (extra error cases)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPlaylistTracks.mockImplementation(async (pid: string) => ({
      tracks:
        pid === 'p1'
          ? [makeTrack('t1', 'p1'), makeTrack('t2', 'p1')]
          : [makeTrack('t3', 'p2')],
    }));
    mockGetUserProfile.mockResolvedValue({ id: 'user123' });
  });

  test('createPlaylist rejection triggers onError and sets error', async () => {
    mockMixPlaylists.mockReturnValue([makeTrack('t1', 'p1')]);
    mockCreatePlaylist.mockImplementation(async () => {
      throw new Error('create failed');
    });
    const onError = jest.fn();
    const utils = renderUseMixGeneration('token', { onError });

    let generated: any = [];
    generated = await act(async () =>
      utils.generateMix([makePlaylist('p1'), makePlaylist('p2')] as any, {}, {})
    );

    await act(async () => {
      await expect(
        utils.createPlaylist('My Mix', generated as any)
      ).rejects.toThrow(/create failed/i);
    });

    expect(onError).toHaveBeenCalled();
    expect(utils.state.error).toBeTruthy();
  });

  test('addTracksToPlaylist rejection triggers onError and leaves playlist present', async () => {
    mockMixPlaylists.mockReturnValue([makeTrack('t1', 'p1')]);
    mockCreatePlaylist.mockResolvedValue({ id: 'new_pl', name: 'My Mix' });
    mockAddTracks.mockImplementation(async () => {
      throw new Error('add tracks failed');
    });
    const onError = jest.fn();
    const utils = renderUseMixGeneration('token', { onError });

    const generated = await act(async () =>
      utils.generateMix([makePlaylist('p1'), makePlaylist('p2')] as any, {}, {})
    );

    await act(async () => {
      await expect(
        utils.createPlaylist('My Mix', generated as any)
      ).rejects.toThrow(/add tracks failed/i);
    });

    expect(onError).toHaveBeenCalled();
    // playlist creation succeeded but add tracks failed; ensure error captured
    expect(utils.state.error).toBeTruthy();
  });
});
