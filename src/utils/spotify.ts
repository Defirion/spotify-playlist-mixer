import type { FetchInstance } from '../services/fetchClient';
import createFetchClient from '../services/fetchClient';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

/**
 * Spotify's current catalog endpoints need a market when the user country is
 * not available to the request. A valid user token normally supplies it, but
 * the browser locale is a safe fallback for browser-only calls. Spotify gives
 * the authenticated user's country priority when it is available.
 */
export const getDefaultMarket = (): string | undefined => {
  if (typeof navigator === 'undefined') return undefined;

  const locales = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];

  for (const locale of locales) {
    const region = locale?.match(/[-_]([A-Za-z]{2})$/)?.[1];
    if (region) return region.toUpperCase();
  }

  return undefined;
};

export const getSpotifyApi = (accessToken: string): FetchInstance => {
  const normalizedToken = (accessToken || '').startsWith('Bearer ')
    ? accessToken.replace(/^Bearer\s+/i, '')
    : accessToken;

  try {
    // Only emit debug logs during development (not in tests)
    if (process.env.NODE_ENV === 'development') {
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

/**
 * Return the item count from Spotify's current playlist shape.
 * The fallback keeps imported snapshots from before the February 2026 rename
 * readable without sending deprecated fields back to Spotify.
 */
export const getPlaylistItemCount = (playlist: {
  items?: { total?: number; length?: number };
  tracks?: { total?: number; length?: number };
}): number =>
  playlist.items?.total ??
  playlist.items?.length ??
  playlist.tracks?.total ??
  playlist.tracks?.length ??
  0;
