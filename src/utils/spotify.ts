import type { AxiosInstance } from 'axios';
import axios from 'axios';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

export const getSpotifyApi = (accessToken: string): AxiosInstance => {
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

  return axios.create({
    baseURL: SPOTIFY_API_BASE,
    headers: {
      Authorization: `Bearer ${normalizedToken}`,
      'Content-Type': 'application/json',
    },
  });
};
