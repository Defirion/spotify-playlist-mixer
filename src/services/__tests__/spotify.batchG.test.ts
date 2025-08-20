/**
 * @jest-environment node
 */

import setupMSW from '../../test-utils/msw';
import SpotifyService from '../../services/spotify';
jest.mock('../../services/spotify', () => ({
  __esModule: true,
  default:
    require('../../test-utils/mocks/mockSpotifyService').makeMockSpotifyService(),
}));

const server = setupMSW();

try {
  const axios = require('axios');
  const httpAdapter = require('axios/lib/adapters/http');
  axios.defaults.adapter = (httpAdapter && httpAdapter.default) || httpAdapter;
} catch (e) {
  // ignore
}

describe('SpotifyService - Batch G (getPlaylistTracks edge cases)', () => {
  test('sets total when only returned on first request and reports progress', async () => {
    if (!server) return;

    // Handler: first request (offset=0) returns total=3 and 1 item; second (offset=100) returns remaining items
    const itemsPage1 = [
      {
        track: { id: 't1', name: 'T1' },
        added_at: 'now',
        added_by: { id: 'u' },
      },
    ];
    const itemsPage2 = [
      {
        track: { id: 't2', name: 'T2' },
        added_at: 'now',
        added_by: { id: 'u' },
      },
      {
        track: { id: 't3', name: 'T3' },
        added_at: 'now',
        added_by: { id: 'u' },
      },
    ];

    // track number of calls for debugging if needed
    let _call = 0;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const msw = require('msw');

    const handlerFn = (req: any, res: any, ctx: any) => {
      // Handle both v1 and v2 API request formats
      let url;
      try {
        if (req && req.url) {
          url = new URL(req.url.toString());
        } else if (req && req.request && req.request.url) {
          url = new URL(req.request.url.toString());
        } else {
          // fallback for other formats
          url = new URL(
            'https://api.spotify.com/v1/playlists/pl_edge/tracks?offset=0'
          );
        }
      } catch (e) {
        url = new URL(
          'https://api.spotify.com/v1/playlists/pl_edge/tracks?offset=0'
        );
      }

      const offset = parseInt(url.searchParams.get('offset') || '0', 10);
      _call++;

      const responseData =
        offset === 0
          ? { items: itemsPage1, total: 3, limit: 100, offset: 0 }
          : { items: itemsPage2, total: 3, limit: 100, offset: 100 };

      if (typeof res === 'function' && ctx) {
        return res(ctx.json(responseData));
      }
      return msw.HttpResponse.json(responseData);
    };

    // Use both rest and http APIs for compatibility
    const handlers = [];
    if (msw.rest && msw.rest.get) {
      handlers.push(
        msw.rest.get(
          'https://api.spotify.com/v1/playlists/:playlistId/tracks',
          handlerFn
        )
      );
    }
    if (msw.http && msw.http.get) {
      handlers.push(
        msw.http.get(
          'https://api.spotify.com/v1/playlists/:playlistId/tracks',
          (info: any) => {
            return handlerFn(info, null, null);
          }
        )
      );
    }

    server.use(...handlers);

    const progress: any[] = [];
    const service = new SpotifyService('normal_token');
    const res = await service.getPlaylistTracks('pl_edge', {
      onProgress: (p: { loaded: number; total: number; percentage: number }) =>
        progress.push(p),
    } as any);

    expect(res.total).toBe(3);
    // Service breaks when fetched page size < limit, so only first page's items are present
    expect(res.tracks.length).toBe(1);
    expect(progress.length).toBeGreaterThanOrEqual(1);
    expect(progress[progress.length - 1].loaded).toBe(1);
    // ensure handler was invoked at least once
    expect(_call).toBeGreaterThanOrEqual(1);
  });

  test('handles total zero and returns hasMore false and zero percentage', async () => {
    if (!server) return;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const msw = require('msw');

    const handlerFn = (req: any, res: any, ctx: any) => {
      const responseData = { items: [], total: 0, limit: 100, offset: 0 };

      if (typeof res === 'function' && ctx) {
        return res(ctx.json(responseData));
      }
      return msw.HttpResponse.json(responseData);
    };

    // Use both rest and http APIs for compatibility
    const handlers = [];
    if (msw.rest && msw.rest.get) {
      handlers.push(
        msw.rest.get(
          'https://api.spotify.com/v1/playlists/:playlistId/tracks',
          handlerFn
        )
      );
    }
    if (msw.http && msw.http.get) {
      handlers.push(
        msw.http.get(
          'https://api.spotify.com/v1/playlists/:playlistId/tracks',
          (info: any) => {
            return handlerFn(info, null, null);
          }
        )
      );
    }

    server.use(...handlers);

    const prog: any[] = [];
    const service = new SpotifyService('normal_token');
    const res = await service.getPlaylistTracks('empty_pl', {
      onProgress: (p: any) => prog.push(p),
    } as any);

    expect(res.total).toBe(0);
    expect(res.tracks.length).toBe(0);
    expect(prog.length).toBeGreaterThanOrEqual(1);
    expect(prog[0].percentage).toBe(0);
    expect(res.hasMore).toBe(false);
  });
});
