import SpotifyGateway from '../spotifyGateway';
import { normalizeSpotifyTrack } from '../spotifyNormalizer';
import { ISpotifyService } from '../../types/api';
import { Playlist, Track } from '../../types/domain';
import { makePlaylist, makeTrack } from '../../test-utils/mocks/spotify';
import { mixPlaylistsWithResult } from '../../utils/mixer';

const ratio = { min: 1, max: 1, weight: 1, weightType: 'frequency' as const };
const options = {
  totalSongs: 100,
  targetDurationSeconds: 3600,
  useAllSongs: true,
  useTimeLimit: false,
  continueWhenPlaylistEmpty: false,
  shuffleTracks: false,
  playlistName: 'Mix',
};
function setup() {
  const service = {
    getPlaylistTracks: vi.fn(),
    createPlaylist: vi.fn(),
    addTracksToPlaylist: vi.fn(),
  };
  return {
    service,
    gateway: new SpotifyGateway(service as unknown as ISpotifyService),
  };
}

test('normalization separates wire fields, preserves milliseconds and optional metadata', async () => {
  const track = normalizeSpotifyTrack(
    makeTrack({
      id: 'x',
      duration_ms: 180123,
      external_ids: { isrc: 'ISRC' },
    })
  );
  expect(track.id).toBe('spotify:x');
  expect(track.durationMs).toBe(180123);
  expect(track.isrc).toBe('ISRC');
  expect(track.artists.every(artist => typeof artist === 'string')).toBe(true);
  expect(track).not.toHaveProperty('duration_ms');
  expect(track).not.toHaveProperty('uri');
  expect(track).not.toHaveProperty('popularity');
  const sparse = normalizeSpotifyTrack({
    id: 'sparse',
    name: 'Sparse',
    uri: 'spotify:track:sparse',
    duration_ms: NaN,
  } as any);
  expect(sparse.durationMs).toBe(0);
  expect(sparse.artists).toEqual([]);
  expect(sparse).not.toHaveProperty('album');
  expect(sparse).not.toHaveProperty('artworkUrl');
  const { service, gateway } = setup();
  service.getPlaylistTracks.mockResolvedValue({
    tracks: [
      {
        id: 'sparse',
        name: 'Sparse',
        uri: 'spotify:track:sparse',
        duration_ms: NaN,
      },
    ],
    total: 1,
    hasMore: false,
  });
  const source = await gateway.getPlaylist({ id: 'sparse', name: 'Sparse' });
  const displayed = gateway.toDisplayTracks([
    { ...source.tracks[0], sourcePlaylist: 'sparse' },
  ]);
  expect(displayed[0].duration_ms).toBe(source.tracks[0].durationMs);
  expect(displayed[0].duration_ms).toBe(0);
});

test('canonical load, mix, editor bridge and destination preserve order and repeated occurrences', async () => {
  const { service, gateway } = setup();
  const a = makeTrack({ id: 'a', duration_ms: 60000 });
  const b = makeTrack({ id: 'b', duration_ms: 120000 });
  service.getPlaylistTracks.mockImplementation(async (id: string) => ({
    tracks:
      id === 'short'
        ? [a, { ...a, name: 'Later occurrence' }]
        : [b, makeTrack({ id: 'c' })],
    total: id === 'short' ? 3 : 2,
    hasMore: false,
  }));
  const short = await gateway.getPlaylist({ id: 'short', name: 'Short' });
  const long = await gateway.getPlaylist({ id: 'long', name: 'Long' });
  expect(short.sourceTotal).toBe(3);
  expect(short.tracks).toHaveLength(2);
  const mix = mixPlaylistsWithResult(
    { short: short.tracks, long: long.tracks },
    { short: ratio, long: ratio },
    options
  );
  expect(mix.exhaustedPlaylists).toEqual(['short']);
  expect(mix.stoppedEarly).toBe(true);
  const complete = mixPlaylistsWithResult(
    { short: short.tracks, long: long.tracks },
    { short: ratio, long: ratio },
    { ...options, continueWhenPlaylistEmpty: true }
  );
  expect(complete.exhaustedPlaylists).toEqual(['short', 'long']);
  expect(complete.stoppedEarly).toBe(false);
  const display = gateway.toDisplayTracks(complete.tracks);
  expect(display[0].name).toBe(a.name);
  const edited = [display[0], display[0], ...display.slice(1)].reverse();
  service.createPlaylist.mockResolvedValue(makePlaylist({ id: 'destination' }));
  service.addTracksToPlaylist.mockResolvedValue({ snapshot_id: 'done' });
  const saved = await gateway.saveDisplayPlaylist('Edited mix', edited);
  expect(saved.items?.total).toBe(edited.length);
  expect(service.addTracksToPlaylist).toHaveBeenCalledWith('destination', {
    uris: edited.map(track => track.uri),
  });
  expect(service.createPlaylist).toHaveBeenCalledWith(
    expect.objectContaining({
      name: 'Edited mix',
      public: false,
    })
  );
});

test('source cancellation and incomplete results cannot publish display data', async () => {
  const { service, gateway } = setup();
  const controller = new AbortController();
  controller.abort();
  service.getPlaylistTracks.mockResolvedValue({
    tracks: [makeTrack()],
    total: 1,
    hasMore: false,
  });
  await expect(
    gateway.getPlaylist({ id: 'p', name: 'P' }, { signal: controller.signal })
  ).rejects.toMatchObject({ name: 'AbortError' });
  service.getPlaylistTracks.mockResolvedValue({
    tracks: [],
    total: 10,
    hasMore: true,
  });
  await expect(gateway.getPlaylist({ id: 'p', name: 'P' })).rejects.toThrow(
    'incomplete'
  );
  await expect(
    gateway.getPlaylist({
      id: 'p',
      name: 'P',
      source: { provider: 'local', id: 'p' },
    })
  ).rejects.toThrow('not a Spotify');
});

test('destination rejects unresolved tracks and stale sessions before creating a playlist', async () => {
  const { service, gateway } = setup();
  const local: Track = {
    id: 'local:x',
    title: 'X',
    artists: [],
    durationMs: 1000,
    sourceRefs: [],
  };
  const playlist: Playlist = { id: '', name: 'Test', tracks: [local] };
  await expect(gateway.savePlaylist(playlist)).rejects.toThrow(
    'destination reference'
  );
  playlist.tracks = [normalizeSpotifyTrack(makeTrack())];
  await expect(
    gateway.savePlaylist(playlist, { isSessionCurrent: () => false })
  ).rejects.toThrow('session changed');
  expect(service.createPlaylist).not.toHaveBeenCalled();
});

test('partial writes are reported once without replaying the operation', async () => {
  const { service, gateway } = setup();
  service.createPlaylist.mockResolvedValue(
    makePlaylist({ id: 'partial', name: 'Partial' })
  );
  service.addTracksToPlaylist.mockRejectedValue(
    Object.assign(new Error('Network failed'), {
      context: { confirmedTracks: 100 },
    })
  );
  const tracks = Array.from({ length: 125 }, () =>
    normalizeSpotifyTrack(makeTrack())
  );
  await expect(
    gateway.savePlaylist({ id: '', name: 'Partial', tracks })
  ).rejects.toThrow('100 of 125 tracks confirmed saved');
  expect(service.createPlaylist).toHaveBeenCalledTimes(1);
  expect(service.addTracksToPlaylist).toHaveBeenCalledTimes(1);
});

test('successful canonical saves return the created source reference and confirmed count', async () => {
  const { service, gateway } = setup();
  service.createPlaylist.mockResolvedValue(makePlaylist({ id: 'saved' }));
  service.addTracksToPlaylist.mockResolvedValue({ snapshot_id: 'done' });
  const tracks = [normalizeSpotifyTrack(makeTrack())];
  const receipt = await gateway.savePlaylist({ id: '', name: 'Test', tracks });
  expect(receipt.confirmedTracks).toBe(1);
  expect(receipt.playlist.source).toMatchObject({
    provider: 'spotify',
    id: 'saved',
  });
  expect(receipt.playlist.sourceTotal).toBe(1);
  expect(receipt.playlist.tracks).toEqual(tracks);
});

test('a session change after creation reports the destination and does not append', async () => {
  const { service, gateway } = setup();
  let current = true;
  service.createPlaylist.mockImplementation(async () => {
    current = false;
    return makePlaylist({ id: 'created' });
  });
  await expect(
    gateway.savePlaylist(
      {
        id: '',
        name: 'Test',
        tracks: [normalizeSpotifyTrack(makeTrack())],
      },
      { isSessionCurrent: () => current }
    )
  ).rejects.toThrow('saving is incomplete');
  expect(service.addTracksToPlaylist).not.toHaveBeenCalled();
});
