import React from 'react';
import { act, render } from '@testing-library/react';
import { useMixGeneration } from '../../hooks/useMixGeneration';

// The global test setup (setupTests.ts) mocks this hook; this file tests the
// real implementation.
vi.unmock('../../hooks/useMixGeneration');

// Mock mixer and spotify service dependencies BEFORE importing actual hook
// implementation. vi.mock factories run during the import phase, so anything
// they close over must be created with vi.hoisted.
const {
  mockMixPlaylists,
  mockGetPlaylistTracks,
  mockGetUserProfile,
  mockCreatePlaylist,
  mockAddTracks,
  MockSpotifyService,
} = vi.hoisted(() => {
  const mockGetPlaylistTracks = vi.fn();
  const mockGetUserProfile = vi.fn();
  const mockCreatePlaylist = vi.fn();
  const mockAddTracks = vi.fn();

  // Class-based mock for SpotifyService with overridable method fns
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

  return {
    mockMixPlaylists: vi.fn(),
    mockGetPlaylistTracks,
    mockGetUserProfile,
    mockCreatePlaylist,
    mockAddTracks,
    MockSpotifyService,
  };
});

vi.mock('../../utils/mixer', () => ({
  mixPlaylists: (...args: any[]) => mockMixPlaylists(...args),
}));

vi.mock('../../services/spotify', () => ({
  __esModule: true,
  default: MockSpotifyService,
}));

// Simple harness to run a hook with React state updates
function renderUseMixGeneration(accessToken: string, options: any = {}) {
  const results: any = {};
  function TestComp() {
    const hookReturn = useMixGeneration(accessToken, options);
    Object.assign(results, hookReturn); // mutate reference
    return null;
  }
  render(<TestComp />);
  return results as ReturnType<typeof useMixGeneration>;
}

// Reusable fixtures
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

describe('useMixGeneration (unit)', () => {
  // Per-suite suppression of benign console noise (SILENCE_POLICY pattern #1)
  let warnSpy: import('vitest').MockInstance;
  let errorSpy: import('vitest').MockInstance;
  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    warnSpy?.mockRestore?.();
    errorSpy?.mockRestore?.();
  });
  const ratioConfig = {
    p1: { min: 1, max: 5, weight: 1, weightType: 'frequency' },
    p2: { min: 1, max: 5, weight: 1, weightType: 'frequency' },
  } as any;
  const mixOptions = {
    totalSongs: 10,
    targetDuration: 0,
    useTimeLimit: false,
    useAllSongs: false,
    playlistName: 'Mix',
    shuffleWithinGroups: false,
    popularityStrategy: 'mixed',
    recencyBoost: false,
    continueWhenPlaylistEmpty: true,
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPlaylistTracks.mockImplementation(async (pid: string) => ({
      tracks:
        pid === 'p1'
          ? [makeTrack('t1', 'p1'), makeTrack('t2', 'p1')]
          : [makeTrack('t3', 'p2')],
    }));
    mockGetUserProfile.mockResolvedValue({ id: 'user123' });
    mockCreatePlaylist.mockImplementation(async (_user: string, body: any) => ({
      id: 'new_pl',
      name: body.name,
    }));
    mockAddTracks.mockResolvedValue({});
    mockMixPlaylists.mockReset();
  });

  test('should generate mixed tracks when playlists and mixer return array result', async () => {
    const arrayResult: any = [makeTrack('t1', 'p1'), makeTrack('t3', 'p2')];
    arrayResult.exhaustedPlaylists = ['p2'];
    arrayResult.stoppedEarly = true;
    mockMixPlaylists.mockReturnValue(arrayResult);

    const onSuccess = vi.fn();
    const utils = renderUseMixGeneration('token', { onSuccess });

    const tracks = await act(async () =>
      utils.generateMix(
        [makePlaylist('p1'), makePlaylist('p2')] as any,
        ratioConfig,
        mixOptions
      )
    );
    expect(tracks).toHaveLength(2);

    expect(utils.state.loading).toBe(false);
    expect(utils.state.mixedTracks.length).toBe(2);
    expect(utils.state.exhaustedPlaylists).toEqual(['p2']);
    expect(utils.state.stoppedEarly).toBe(true);
    expect(onSuccess).toHaveBeenCalledWith(expect.any(Array));
  });

  test('should throw and set error when fewer than two playlists selected', async () => {
    mockMixPlaylists.mockReturnValue([]);
    const onError = vi.fn();
    const utils = renderUseMixGeneration('token', { onError });
    await act(async () => {
      await expect(
        utils.generateMix([makePlaylist('p1')] as any, ratioConfig, mixOptions)
      ).rejects.toThrow(/at least 2 playlists/i);
    });
    expect(onError).toHaveBeenCalled();
    expect(utils.state.error).toMatch(/at least 2 playlists/i);
  });

  test('should surface error when no tracks found in selected playlists', async () => {
    mockGetPlaylistTracks.mockResolvedValue({ tracks: [] });
    mockMixPlaylists.mockReturnValue([]); // not reached
    const utils = renderUseMixGeneration('token');
    await act(async () => {
      await expect(
        utils.generateMix(
          [makePlaylist('p1'), makePlaylist('p2')] as any,
          ratioConfig,
          mixOptions
        )
      ).rejects.toThrow(/No tracks found/i);
    });
    expect(utils.state.error).toMatch(/No tracks/);
  });

  test('should error when mixer produces no tracks (empty array)', async () => {
    // Provide tracks but mixer returns []
    mockGetPlaylistTracks
      .mockResolvedValueOnce({ tracks: [makeTrack('x', 'p1')] })
      .mockResolvedValueOnce({ tracks: [makeTrack('y', 'p2')] });
    mockMixPlaylists.mockReturnValue([]);
    const onError = vi.fn();
    const utils = renderUseMixGeneration('token', { onError });
    await act(async () => {
      await expect(
        utils.generateMix(
          [makePlaylist('p1'), makePlaylist('p2')] as any,
          ratioConfig,
          mixOptions
        )
      ).rejects.toThrow(/no tracks generated/i);
    });
    expect(onError).toHaveBeenCalled();
    expect(utils.state.error).toMatch(/no tracks generated/i);
  });

  test('should handle object-form mixResult with tracks property', async () => {
    mockMixPlaylists.mockReturnValue({
      tracks: [makeTrack('a', 'p1'), makeTrack('b', 'p2')],
      exhaustedPlaylists: ['p1'],
      stoppedEarly: false,
    });
    const utils = renderUseMixGeneration('token');
    await act(async () => {
      await utils.generateMix(
        [makePlaylist('p1'), makePlaylist('p2')] as any,
        ratioConfig,
        mixOptions
      );
    });
    expect(utils.state.mixedTracks.length).toBe(2);
    expect(utils.state.exhaustedPlaylists).toEqual(['p1']);
  });

  test('should create playlist successfully with valid inputs', async () => {
    // Provide a successful generation first
    mockMixPlaylists.mockReturnValue({
      tracks: [makeTrack('a', 'p1'), makeTrack('b', 'p2')],
    });
    const utils = renderUseMixGeneration('token');
    let generated: any[] = [];
    generated = await act(async () =>
      utils.generateMix(
        [makePlaylist('p1'), makePlaylist('p2')] as any,
        ratioConfig,
        mixOptions
      )
    );
    const playlist = await act(async () =>
      utils.createPlaylist('My Mix', generated as any)
    );
    expect(playlist.id).toBe('new_pl');
    expect(mockCreatePlaylist).toHaveBeenCalledWith(
      'user123',
      expect.objectContaining({ name: 'My Mix' })
    );
    expect(mockAddTracks).toHaveBeenCalled();
  });

  test('should error when creating playlist with empty name', async () => {
    mockMixPlaylists.mockReturnValue({
      tracks: [makeTrack('a', 'p1'), makeTrack('b', 'p2')],
    });
    const utils = renderUseMixGeneration('token');
    await act(async () => {
      await utils.generateMix(
        [makePlaylist('p1'), makePlaylist('p2')] as any,
        ratioConfig,
        mixOptions
      );
    });
    await act(async () => {
      await expect(
        utils.createPlaylist('   ', utils.state.mixedTracks)
      ).rejects.toThrow(/playlist name/i);
    });
  });

  test('should reset state to initial values', async () => {
    mockMixPlaylists.mockReturnValue({
      tracks: [makeTrack('a', 'p1'), makeTrack('b', 'p2')],
    });
    const utils = renderUseMixGeneration('token');
    await act(async () => {
      await utils.generateMix(
        [makePlaylist('p1'), makePlaylist('p2')] as any,
        ratioConfig,
        mixOptions
      );
    });
    act(() => utils.reset());
    expect(utils.state.mixedTracks).toHaveLength(0);
    expect(utils.state.error).toBeNull();
    expect(utils.state.loading).toBe(false);
  });
});
