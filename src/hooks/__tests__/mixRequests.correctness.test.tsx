import { act, renderHook } from '@testing-library/react';
import { useMixPreview } from '../useMixPreview';
import { useMixGeneration } from '../useMixGeneration';
import { useTrackSelection } from '../useTrackSelection';
import usePlaylistTracks from '../usePlaylistTracks';
import { makePlaylist, makeTrack } from '../../test-utils/mocks/spotify';

vi.unmock('../useMixPreview');
vi.unmock('../useMixGeneration');
const { getTracks, createPlaylist, addTracks } = vi.hoisted(() => ({
  getTracks: vi.fn(),
  createPlaylist: vi.fn(),
  addTracks: vi.fn(),
}));
vi.mock('../../services/spotify', () => ({
  default: class {
    getPlaylistTracks = getTracks;
    createPlaylist = createPlaylist;
    addTracksToPlaylist = addTracks;
  },
}));
const playlists = [makePlaylist({ id: 'a' }), makePlaylist({ id: 'b' })];
const ratios = {
  a: { min: 1, max: 1, weight: 1, weightType: 'frequency' as const },
  b: { min: 1, max: 1, weight: 1, weightType: 'frequency' as const },
};
const options = {
  totalSongs: 2,
  targetDurationSeconds: 3600,
  useAllSongs: false,
  useTimeLimit: false,
  shuffleTracks: false,
  continueWhenPlaylistEmpty: true,
  playlistName: 'Test',
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => {
    resolve = res;
  });
  return { promise, resolve };
}
beforeEach(() => {
  vi.clearAllMocks();
  getTracks.mockImplementation(async (id: string) => ({
    tracks: [makeTrack({ id, uri: `spotify:track:${id}` })],
    total: 1,
    hasMore: false,
  }));
});

test('a save cannot be submitted twice even if mix state is reset while creation is pending', async () => {
  const pendingCreation = deferred<any>();
  createPlaylist.mockReturnValueOnce(pendingCreation.promise);
  addTracks.mockResolvedValueOnce({ snapshot_id: 'saved' });
  const { result } = renderHook(() => useMixGeneration('token'));
  const tracks = [{ ...makeTrack(), sourcePlaylist: 'a' }];
  let saving!: ReturnType<typeof result.current.createPlaylist>;
  act(() => {
    saving = result.current.createPlaylist('Test', tracks);
  });
  act(() => result.current.reset());
  expect(result.current.state.loading).toBe(true);
  await act(async () => {
    await expect(result.current.createPlaylist('Test', tracks)).rejects.toThrow(
      'already in progress'
    );
  });
  await act(async () => {
    pendingCreation.resolve(makePlaylist());
    await saving;
  });
  expect(createPlaylist).toHaveBeenCalledTimes(1);
  expect(addTracks).toHaveBeenCalledTimes(1);
});

test('a late preview cannot overwrite a newer preview', async () => {
  const slow = deferred<any>();
  getTracks.mockImplementationOnce(() => slow.promise);
  const { result } = renderHook(() => useMixPreview('token'));
  let old!: Promise<void>;
  act(() => {
    old = result.current.generatePreview(playlists, ratios, options);
  });
  const oldSignal = getTracks.mock.calls[0][1].signal;
  await act(async () => {
    await result.current.generatePreview(playlists, ratios, options);
  });
  const latest = result.current.state.preview;
  expect(oldSignal.aborted).toBe(true);
  await act(async () => {
    slow.resolve({ tracks: [makeTrack({ id: 'stale' })] });
    await old;
  });
  expect(result.current.state.preview).toBe(latest);
  expect(result.current.state.loading).toBe(false);
});

test('token renewal preserves an edited completed preview while logout clears it', async () => {
  const { result, rerender } = renderHook(({ token }) => useMixPreview(token), {
    initialProps: { token: 'initial' },
  });
  await act(async () => {
    await result.current.generatePreview(playlists, ratios, options);
  });
  const edited = [...result.current.getPreviewTracks()].reverse();
  act(() => result.current.updateTrackOrder(edited));
  const completed = result.current.state.preview;
  rerender({ token: 'renewed' });
  expect(result.current.state.preview).toBe(completed);
  expect(result.current.getPreviewTracks()).toEqual(edited);
  expect(result.current.state.loading).toBe(false);
  expect(getTracks).toHaveBeenCalledTimes(2);
  rerender({ token: '' });
  expect(result.current.state.preview).toBeNull();
  expect(result.current.getPreviewTracks()).toEqual([]);
});

test('clearing a preview cancels loading and prevents late restoration', async () => {
  const slow = deferred<any>();
  getTracks.mockReturnValueOnce(slow.promise);
  const { result } = renderHook(() => useMixPreview('token'));
  let pending!: Promise<void>;
  act(() => {
    pending = result.current.generatePreview(playlists, ratios, options);
  });
  act(() => result.current.clearPreview());
  await act(async () => {
    slow.resolve({ tracks: [] });
    await pending;
  });
  expect(result.current.state).toMatchObject({
    preview: null,
    loading: false,
    error: null,
  });
});

test('logout cancels an active preview and unmount cancels transport', async () => {
  const slow = deferred<any>();
  getTracks.mockReturnValue(slow.promise);
  const { result, rerender, unmount } = renderHook(
    ({ token }) => useMixPreview(token),
    { initialProps: { token: 'token' } }
  );
  let pending!: Promise<void>;
  act(() => {
    pending = result.current.generatePreview(playlists, ratios, options);
  });
  rerender({ token: '' });
  await act(async () => {
    slow.resolve({ tracks: [] });
    await pending;
  });
  expect(result.current.state.preview).toBeNull();
  rerender({ token: 'token' });
  const next = deferred<any>();
  getTracks.mockReturnValue(next.promise);
  act(() => {
    pending = result.current.generatePreview(playlists, ratios, options);
  });
  const signal =
    getTracks.mock.calls[getTracks.mock.calls.length - 1][1].signal;
  unmount();
  expect(signal.aborted).toBe(true);
  next.resolve({ tracks: [] });
  await pending;
});

test('late playlist results and progress cannot clear the newer request loading state', async () => {
  const old = deferred<any>(),
    latest = deferred<any>();
  getTracks
    .mockReturnValueOnce(old.promise)
    .mockReturnValueOnce(latest.promise);
  const onProgress = vi.fn();
  const { result, rerender } = renderHook(
    ({ id }) => usePlaylistTracks('token', id, { onProgress }),
    { initialProps: { id: 'a' } }
  );
  const oldProgress = getTracks.mock.calls[0][1].onProgress;
  rerender({ id: 'b' });
  await act(async () => {
    oldProgress({ loaded: 99, total: 99, percentage: 100 });
    old.resolve({
      tracks: [makeTrack({ id: 'stale' })],
      total: 1,
      hasMore: false,
    });
  });
  expect(result.current.loading).toBe(true);
  expect(result.current.tracks).toEqual([]);
  expect(onProgress).not.toHaveBeenCalled();
  await act(async () => {
    latest.resolve({
      tracks: [makeTrack({ id: 'new' })],
      total: 10,
      hasMore: false,
    });
  });
  expect(result.current.tracks[0].id).toBe('new');
  expect(result.current.progress).toEqual({
    loaded: 1,
    total: 10,
    percentage: 100,
  });
});

test('duplicate occurrences can be selected separately', () => {
  const first = { ...makeTrack(), instanceId: 'first' };
  const second = { ...makeTrack(), instanceId: 'second' };
  const onAddTracks = vi.fn();
  const { result } = renderHook(() =>
    useTrackSelection({ availableTracks: [first, second], onAddTracks })
  );
  act(() => result.current.handleTrackSelect(second));
  act(() => result.current.handleAddSelected());
  expect(onAddTracks).toHaveBeenCalledWith([second]);
});

test('partial save reports the created playlist and never returns full success', async () => {
  createPlaylist.mockResolvedValueOnce(
    makePlaylist({
      id: 'destination',
      name: 'Test',
      external_urls: {
        spotify: 'https://open.spotify.com/playlist/destination',
      },
    })
  );
  addTracks.mockRejectedValueOnce(
    Object.assign(new Error('Network failed'), {
      context: { confirmedTracks: 100 },
    })
  );
  const onError = vi.fn();
  const { result } = renderHook(() => useMixGeneration('token', { onError }));
  const tracks = Array.from({ length: 150 }, () => ({
    ...makeTrack(),
    sourcePlaylist: 'a',
  }));
  await act(async () => {
    await expect(result.current.createPlaylist('Test', tracks)).rejects.toThrow(
      '100 of 150 tracks confirmed saved'
    );
  });
  expect(onError).toHaveBeenCalledWith(expect.stringContaining('destination'));
  expect(result.current.state.loading).toBe(false);
});
