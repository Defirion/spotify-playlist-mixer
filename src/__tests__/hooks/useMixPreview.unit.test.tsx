import React from 'react';
import { act, render } from '@testing-library/react';
import { useMixPreview } from '../../hooks/useMixPreview';

// This file tests the real hook; the global setup mock must not apply.
vi.unmock('../../hooks/useMixPreview');

// Mock mixer and spotify service. vi.mock factories run during the import
// phase, so anything they close over must come from vi.hoisted.
const { mockMixPlaylists, mockGetPlaylistTracks, MockSpotifyService } =
  vi.hoisted(() => {
    const mockGetPlaylistTracks = vi.fn();
    class MockSpotifyService {
      accessToken: string;
      constructor(token: string) {
        this.accessToken = token;
      }
      getPlaylistTracks(...args: any[]) {
        return mockGetPlaylistTracks(...args);
      }
    }
    return {
      mockMixPlaylists: vi.fn(),
      mockGetPlaylistTracks,
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

function renderUseMixPreview(accessToken: string, options: any = {}) {
  const results: any = {};
  function TestComp() {
    const hookReturn = useMixPreview(accessToken, options);
    Object.assign(results, hookReturn);
    return null;
  }
  render(<TestComp />);
  return results as ReturnType<typeof useMixPreview>;
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

describe('useMixPreview (unit)', () => {
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
    totalSongs: 5,
    targetDuration: 0,
    useTimeLimit: false,
    useAllSongs: false,
    playlistName: 'Preview',
    shuffleWithinGroups: false,
    popularityStrategy: 'front-loaded',
    recencyBoost: false,
    continueWhenPlaylistEmpty: true,
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPlaylistTracks.mockImplementation(async (pid: string) => ({
      tracks: pid === 'p1' ? [makeTrack('t1', 'p1')] : [makeTrack('t2', 'p2')],
    }));
    mockMixPlaylists.mockReset();
  });

  test('should generate preview and compute stats and duration when mixer returns array', async () => {
    const arr: any = [makeTrack('t1', 'p1'), makeTrack('t2', 'p2')];
    arr.exhaustedPlaylists = [];
    arr.stoppedEarly = false;
    mockMixPlaylists.mockReturnValue(arr);
    const utils = renderUseMixPreview('token');
    await act(async () => {
      await utils.generatePreview(
        [makePlaylist('p1'), makePlaylist('p2')] as any,
        ratioConfig,
        mixOptions
      );
    });
    expect(utils.state.preview).not.toBeNull();
    expect(utils.state.preview.tracks).toHaveLength(2);
    expect(utils.state.preview.totalDuration).toBeGreaterThan(0);
    expect(Object.keys(utils.state.preview.stats)).toContain('p1');
    expect(Object.keys(utils.state.preview.stats)).toContain('p2');
  });

  test('should handle object-form mixer result with stats recalculated', async () => {
    mockMixPlaylists.mockReturnValue({
      tracks: [makeTrack('a', 'p1'), makeTrack('b', 'p2')],
      exhaustedPlaylists: ['p2'],
      stoppedEarly: true,
    });
    const utils = renderUseMixPreview('token');
    await act(async () => {
      await utils.generatePreview(
        [makePlaylist('p1'), makePlaylist('p2')] as any,
        ratioConfig,
        mixOptions
      );
    });
    expect(utils.state.preview?.exhaustedPlaylists).toEqual(['p2']);
    expect(utils.state.preview?.stoppedEarly).toBe(true);
  });

  test('should set error when spotify service not available (no token)', async () => {
    const onError = vi.fn();
    const utils = renderUseMixPreview('', { onError });
    await act(async () => {
      await utils.generatePreview(
        [makePlaylist('p1'), makePlaylist('p2')] as any,
        ratioConfig,
        mixOptions
      );
    });
    expect(utils.state.error).toMatch(/service not available/i);
    expect(onError).toHaveBeenCalled();
  });

  test('should update track order and recalc stats', async () => {
    mockMixPlaylists.mockReturnValue([
      makeTrack('a', 'p1'),
      makeTrack('b', 'p2'),
    ]);
    const utils = renderUseMixPreview('token');
    await act(async () => {
      await utils.generatePreview(
        [makePlaylist('p1'), makePlaylist('p2')] as any,
        ratioConfig,
        mixOptions
      );
    });
    const reversed = [...utils.state.preview.tracks].reverse();
    act(() => utils.updateTrackOrder(reversed));
    expect(utils.getPreviewTracks()[0].id).toBe(reversed[0].id);
  });

  test('should clear preview and custom ordering', async () => {
    mockMixPlaylists.mockReturnValue([
      makeTrack('a', 'p1'),
      makeTrack('b', 'p2'),
    ]);
    const utils = renderUseMixPreview('token');
    await act(async () => {
      await utils.generatePreview(
        [makePlaylist('p1'), makePlaylist('p2')] as any,
        ratioConfig,
        mixOptions
      );
    });
    act(() => utils.clearPreview());
    expect(utils.state.preview).toBeNull();
    expect(utils.getPreviewTracks()).toHaveLength(0);
  });

  test('should prefer custom track order when present for getPreviewTracks', async () => {
    mockMixPlaylists.mockReturnValue([
      makeTrack('a', 'p1'),
      makeTrack('b', 'p2'),
    ]);
    const utils = renderUseMixPreview('token');
    await act(async () => {
      await utils.generatePreview(
        [makePlaylist('p1'), makePlaylist('p2')] as any,
        ratioConfig,
        mixOptions
      );
    });
    const custom = [makeTrack('x', 'p1'), makeTrack('y', 'p2')];
    act(() => utils.updateTrackOrder(custom));
    expect(utils.getPreviewTracks()).toEqual(custom);
  });
});
