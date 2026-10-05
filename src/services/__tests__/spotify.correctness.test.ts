import SpotifyService from '../spotify';
import { FetchInstance } from '../fetchClient';
import { ApiErrorHandler } from '../apiErrorHandler';
import { readRetryAfterSeconds } from '../_helpers/retry';
import { makeTrack } from '../../test-utils/mocks/spotify';

const fetchMock = vi.fn();
const response = (
  data: unknown,
  status = 200,
  headers: Record<string, string> = {}
) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
const service = () =>
  new SpotifyService(
    new FetchInstance({ baseURL: 'https://api.spotify.com/v1' }),
    new ApiErrorHandler({ enableLogging: false })
  );

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

test('a fully filtered page still follows explicit metadata and reports source total separately', async () => {
  fetchMock
    .mockResolvedValueOnce(
      response({
        items: [
          null,
          { item: null },
          { item: { ...makeTrack(), type: 'episode' } },
          { item: makeTrack({ is_playable: false }) },
        ],
        total: 5,
        offset: 0,
        limit: 4,
        next: 'https://api.spotify.com/v1/playlists/p/items?offset=4&limit=4',
      })
    )
    .mockResolvedValueOnce(
      response({
        items: [{ item: makeTrack({ id: 'usable' }) }],
        total: 5,
        offset: 4,
        limit: 4,
        next: null,
      })
    );
  const progress = vi.fn();
  const result = await service().getPlaylistTracks('p', {
    onProgress: progress,
  });
  expect(result).toMatchObject({ total: 5, hasMore: false });
  expect(result.tracks.map(track => track.id)).toEqual(['usable']);
  expect(fetchMock.mock.calls[1][0]).toContain('offset=4');
  expect(progress).toHaveBeenLastCalledWith({
    loaded: 1,
    total: 5,
    percentage: 100,
  });
});

test('explicit next null stops even when total claims more items', async () => {
  fetchMock.mockResolvedValueOnce(
    response({ items: [{ item: makeTrack() }], total: 100, next: null })
  );
  await service().getPlaylistTracks('p');
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('malformed and non-advancing pages fail rather than reporting completion', async () => {
  fetchMock.mockResolvedValueOnce(response({ total: 100 }));
  await expect(service().getPlaylistTracks('p')).rejects.toThrow('incomplete');
  fetchMock.mockResolvedValueOnce(
    response({ items: [], next: '?offset=0', total: 100 })
  );
  await expect(service().getPlaylistTracks('p')).rejects.toThrow(
    'did not advance'
  );
});

test('native Headers and legacy objects read Retry-After in seconds', () => {
  expect(readRetryAfterSeconds(new Headers({ 'Retry-After': '5' }))).toBe(5);
  expect(readRetryAfterSeconds({ 'Retry-After': '0' })).toBe(0);
  expect(readRetryAfterSeconds({ 'retry-after': '-1' })).toBeNull();
});

test('429 waits the full Retry-After before retrying', async () => {
  vi.useFakeTimers();
  fetchMock
    .mockResolvedValueOnce(
      response({ error: { message: 'Slow down' } }, 429, { 'Retry-After': '5' })
    )
    .mockResolvedValueOnce(response({ items: [], total: 0, next: null }));
  const loading = service().getPlaylistTracks('p');
  await vi.advanceTimersByTimeAsync(4999);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1);
  await loading;
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test('cancellation stops a rate-limit wait and propagates the transport signal', async () => {
  vi.useFakeTimers();
  fetchMock.mockResolvedValueOnce(response({}, 429, { 'Retry-After': '10' }));
  const controller = new AbortController();
  const loading = service().getPlaylistTracks('p', {
    signal: controller.signal,
  });
  const rejection = expect(loading).rejects.toMatchObject({
    name: 'AbortError',
  });
  await vi.advanceTimersByTimeAsync(1);
  expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal);
  controller.abort();
  await rejection;
  await vi.advanceTimersByTimeAsync(20000);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('403 access restrictions terminate without retry', async () => {
  fetchMock.mockResolvedValueOnce(
    response({ error: { message: 'Access denied' } }, 403)
  );
  await expect(service().getPlaylistTracks('p')).rejects.toMatchObject({
    status: 403,
    type: 'AUTHORIZATION',
  });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('ambiguous creation failure is never automatically replayed', async () => {
  fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
  await expect(service().createPlaylist({ name: 'Test' })).rejects.toThrow();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('a failed second batch preserves confirmed progress and URI order without replay', async () => {
  const uris = Array.from({ length: 150 }, (_, i) => `spotify:track:${i % 20}`);
  fetchMock
    .mockResolvedValueOnce(response({ snapshot_id: 'first' }))
    .mockRejectedValueOnce(new TypeError('Failed to fetch'));
  await expect(
    service().addTracksToPlaylist('p', { uris })
  ).rejects.toMatchObject({
    context: { confirmedTracks: 100, totalTracks: 150, batchIndex: 1 },
  });
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(
    fetchMock.mock.calls.flatMap(([, request]) => JSON.parse(request.body).uris)
  ).toEqual(uris);
});
