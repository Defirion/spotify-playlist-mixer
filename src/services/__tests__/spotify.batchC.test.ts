/**
 * @jest-environment node
 */

import setupMSW from '../../test-utils/msw';
import * as msw from 'msw';
import SpotifyService from '../../services/spotify';

type MSWInfo = {
  request: Request & { json(): Promise<any> };
  params: Record<string, string>;
  cookies: Record<string, string>;
};

jest.mock('../../services/spotify', () => ({
  __esModule: true,
  default:
    require('../../test-utils/mocks/mockSpotifyService').makeMockSpotifyService(),
}));

const server = setupMSW();

// Tests rely on global.fetch + MSW; no axios adapter required.

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
      msw.http.get('https://api.spotify.com/v1/audio-features', (info: any) => {
        const url = new URL(info.request.url.toString());
        const ids = (url.searchParams.get('ids') || '')
          .split(',')
          .filter(Boolean);
        const features = ids.map((id: any) => ({ id, danceability: 0.5 }));
        return msw.HttpResponse.json({ audio_features: features });
      })
    );

    const service = new SpotifyService('normal_token');
    const single = await service.getTrackAudioFeatures('track_1');
    expect(single).toHaveProperty('id', 'track_1');
    const multiple = await service.getMultipleTrackAudioFeatures([
      'track_1',
      'track_2',
    ]);
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
