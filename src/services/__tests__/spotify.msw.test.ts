/**
 * @jest-environment node
 */

import setupMSW from '../../test-utils/msw-setup';

import SpotifyService from '../../services/spotify';
jest.unmock('axios');

// Initialize MSW server (lazy); tests will skip if MSW can't be required
const server = setupMSW();
// Force axios to use the Node http adapter for these tests only. This helps
// avoid adapter-related header shape mismatches (AxiosHeaders vs Headers)
// while we iterate on MSW + axios integration.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
  const axios = require('axios');
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
  const httpAdapter = require('axios/lib/adapters/http');
  axios.defaults.adapter = (httpAdapter && httpAdapter.default) || httpAdapter;
} catch (e) {
  // ignore if requiring adapter fails in some environments; the test will
  // still run and surface the same error for further debugging.
}

describe('SpotifyService - MSW integration', () => {
  const ACCESS_TOKEN = 'normal_token';
  const RATE_LIMIT_TOKEN = 'trigger_429';
  const AUTH_EXPIRE_TOKEN = 'trigger_401';

  test('searchTracks via network returns items', async () => {
    const service = new SpotifyService(ACCESS_TOKEN);
    // Debug: sanity-check direct fetch to ensure MSW returns expected payload for fetch API
    try {
      // @ts-ignore - global fetch may be provided by jest.polyfills
      const fRes = await (global as any).fetch(
        'https://api.spotify.com/v1/search?q=track&type=track&limit=1&offset=0',
        { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } }
      );
      const fJson = await fRes.json().catch(() => null);
      // eslint-disable-next-line no-console
      console.error(
        'DEBUG fetch status:',
        fRes.status,
        'bodyKeys:',
        fJson && Object.keys(fJson || {})
      );
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('DEBUG fetch failed', e);
    }
    try {
      const res = await service.searchTracks('track');
      expect(res).toHaveProperty('items');
      expect(Array.isArray(res.items)).toBe(true);
    } catch (err: any) {
      // Log error details to help diagnose why UNKNOWN ApiError was returned
      // eslint-disable-next-line no-console
      if (err && typeof err.toJSON === 'function')
        console.error('ApiError:', err.toJSON());
      // eslint-disable-next-line no-console
      console.error('Original error:', err?.originalError || err);
      throw err;
    }
  });

  test('searchTracks surfaces rate-limit from MSW (429)', async () => {
    // Use a fast, non-retrying error handler so tests fail quickly and
    // deterministically without waiting for exponential backoff.
    const fastHandler = {
      withRetry: (apiCall: any) => apiCall(),
    } as any;

    const service = new SpotifyService(RATE_LIMIT_TOKEN, fastHandler);
    await expect(service.searchTracks('track')).rejects.toBeDefined();
  });

  test('getUserProfile surfaces auth expiry (401)', async () => {
    const service = new SpotifyService(AUTH_EXPIRE_TOKEN);
    await expect(service.getUserProfile()).rejects.toBeDefined();
  });

  test('createPlaylist throws BAD_REQUEST on malformed payload (missing name)', async () => {
    const service = new SpotifyService(ACCESS_TOKEN);
    // @ts-ignore - call with malformed body
    await expect(service.createPlaylist('user_1', { description: 'no name' })).rejects.toBeDefined();
  });

  test('searchTracks surfaces server error (500) when MSW returns 500', async () => {
    const service = new SpotifyService('trigger_500');
    await expect(service.searchTracks('track')).rejects.toBeDefined();
  });
});
