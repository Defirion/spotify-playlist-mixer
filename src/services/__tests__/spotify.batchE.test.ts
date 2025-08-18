/**
 * @jest-environment node
 */

import setupMSW from '../../test-utils/msw-setup';

import SpotifyService from '../../services/spotify';
import { ApiError } from '../../services/apiErrorHandler';
jest.unmock('axios');

// Initialize MSW server
const server = setupMSW();

try {
  // Ensure axios uses the http adapter in node tests for consistent headers
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
  const axios = require('axios');
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
  const httpAdapter = require('axios/lib/adapters/http');
  axios.defaults.adapter = (httpAdapter && httpAdapter.default) || httpAdapter;
} catch (e) {
  // ignore
}

describe('SpotifyService - Batch E (remove/create/playlists edge cases)', () => {
  const ACCESS_TOKEN = 'normal_token';

  test('removeTracksFromPlaylist returns snapshot_id for valid request', async () => {
    if (!server) return;
    const service = new SpotifyService(ACCESS_TOKEN);
    const res = await service.removeTracksFromPlaylist('playlist_1', {
      tracks: [{ uri: 'spotify:track:track_1' }],
    });
    expect(res).toHaveProperty('snapshot_id');
  });

  test('removeTracksFromPlaylist throws BAD_REQUEST when tracks array empty', async () => {
    const service = new SpotifyService(ACCESS_TOKEN);
    await expect(
      // @ts-ignore - intentionally malformed
      service.removeTracksFromPlaylist('playlist_1', { tracks: [] })
    ).rejects.toBeInstanceOf(ApiError);
  });

  test('createPlaylist surfaces rate-limit (429) quickly by zeroing retry delay', async () => {
    // Speed up retries by forcing zero delay on ApiError
    const originalGetRetryDelay = ApiError.prototype.getRetryDelay;
    // @ts-ignore override for test
    ApiError.prototype.getRetryDelay = function () {
      return 0;
    };

    try {
      const service = new SpotifyService('trigger_429');
      await expect(
        service.createPlaylist('user_1', { name: 'new playlist' })
      ).rejects.toBeInstanceOf(ApiError);
    } finally {
      // restore
      // @ts-ignore
      ApiError.prototype.getRetryDelay = originalGetRetryDelay;
    }
  });

  test('createPlaylist surfaces server error (500)', async () => {
    const service = new SpotifyService('trigger_500');
    await expect(
      service.createPlaylist('user_1', { name: 'my list' })
    ).rejects.toBeInstanceOf(ApiError);
  });

  test('getUserPlaylists throws when limit > 50', async () => {
    const service = new SpotifyService(ACCESS_TOKEN);
    await expect(
      service.getUserPlaylists({ limit: 51 })
    ).rejects.toBeInstanceOf(ApiError);
  });

  test('getUserPlaylists with all=true returns combined items', async () => {
    const service = new SpotifyService(ACCESS_TOKEN);
    const res = await service.getUserPlaylists({ all: true });
    expect(res).toHaveProperty('items');
    expect(Array.isArray(res.items)).toBe(true);
    expect(res.items.length).toBeGreaterThan(0);
  });
});
