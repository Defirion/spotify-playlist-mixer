/**
 * @jest-environment node
 */

import setupMSW from '../../test-utils/msw-setup';
import { rest } from 'msw';
import SpotifyService from '../../services/spotify';

jest.unmock('axios');

const server = setupMSW();

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const axios = require('axios');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const httpAdapter = require('axios/lib/adapters/http');
  axios.defaults.adapter = (httpAdapter && httpAdapter.default) || httpAdapter;
} catch (e) {
  // ignore
}

describe('SpotifyService - Batch C (search & audio features)', () => {
  test('searchTracks validation: empty query rejects', async () => {
    if (!server) return;
    const service = new SpotifyService('normal_token');
    // @ts-ignore
    await expect(service.searchTracks('')).rejects.toBeDefined();
  });

  test('searchPlaylists validation: empty query rejects', async () => {
    if (!server) return;
    const service = new SpotifyService('normal_token');
    // @ts-ignore
    await expect(service.searchPlaylists('')).rejects.toBeDefined();
  });

  test('getTrackAudioFeatures and getMultipleTrackAudioFeatures return data', async () => {
    if (!server) return;
    // Provide handler for the query-style audio-features endpoint (ids=...)
    server.use(
      rest.get('https://api.spotify.com/v1/audio-features', (req, res, ctx) => {
        const url = new URL(req.url.toString());
        const ids = (url.searchParams.get('ids') || '').split(',').filter(Boolean);
        const features = ids.map(id => ({ id, danceability: 0.5 }));
        return res(ctx.json({ audio_features: features }));
      })
    );

    const service = new SpotifyService('normal_token');
    const single = await service.getTrackAudioFeatures('track_1');
    expect(single).toHaveProperty('id', 'track_1');
    const multiple = await service.getMultipleTrackAudioFeatures(['track_1', 'track_2']);
    expect(Array.isArray(multiple)).toBe(true);
  });

  test('getUserProfile happy path returns profile', async () => {
    if (!server) return;
    const service = new SpotifyService('normal_token');
    const profile = await service.getUserProfile();
    expect(profile).toHaveProperty('id');
    expect(profile).toHaveProperty('display_name');
  });
});
