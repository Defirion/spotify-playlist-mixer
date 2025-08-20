import type { FetchInstance } from '../services/fetchClient';
import createFetchClient from '../services/fetchClient';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

export const getSpotifyApi = (accessToken: string): FetchInstance => {
  const normalizedToken = (accessToken || '').startsWith('Bearer ')
    ? accessToken.replace(/^Bearer\s+/i, '')
    : accessToken;

  try {
    if (process.env.NODE_ENV !== 'test') {
      const maskedToken = normalizedToken
        ? normalizedToken.length > 10
          ? `${normalizedToken.slice(0, 6)}...${normalizedToken.slice(-4)}`
          : normalizedToken
        : null;
      // eslint-disable-next-line no-console
      console.debug('getSpotifyApi: normalizedToken(masked)=', maskedToken);
    }
  } catch (_) {
    // ignore
  }

  const instance = createFetchClient({
    baseURL: SPOTIFY_API_BASE,
    headers: {
      Authorization: `Bearer ${normalizedToken}`,
      'Content-Type': 'application/json',
    },
  });

  // Fetch-based client does not support axios-style transforms. Tests expect
  // downstream code to be able to read headers via a Headers-like API. The
  // FetchInstance returns native Response.headers which is already a Headers
  // object in node (via polyfills used in tests) or in browsers, so no extra
  // normalization is necessary here.

  return instance;
};
