import type { AxiosInstance } from 'axios';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

export const getSpotifyApi = (accessToken: string): AxiosInstance => {
  // Lazy-require axios at runtime to avoid loading ESM entrypoints during Jest
  // module parsing in some environments.
  // Prefer the CommonJS build of axios when available so Jest (which uses
  // CJS require) doesn't attempt to parse axios' ESM entrypoint.
  let axiosModule: any = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    axiosModule = require('axios/dist/node/axios.cjs');
  } catch (e) {
    // Fallback to the package entry; some environments may not include the
    // prebuilt CJS bundle in that location.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    axiosModule = require('axios');
  }
  const axios =
    axiosModule && axiosModule.default ? axiosModule.default : axiosModule;

  // headers-polyfill is optional; require lazily as well
  let headersPolyfill: any = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    headersPolyfill = require('headers-polyfill');
  } catch (e) {
    headersPolyfill = null;
  }

  const instance = axios.create({
    baseURL: SPOTIFY_API_BASE,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  // Attach a per-instance transformResponse normalization so we don't need
  // test-time global monkey-patches. Keep it minimal and defensive.
  const normalizeHeadersTransform = function (data: any, headers: any) {
    try {
      if (headers && typeof headers.all !== 'function' && headersPolyfill) {
        const normalized = new headersPolyfill.Headers(headers);
        // Replace the headers arg so downstream transforms see a Headers-like object
        // eslint-disable-next-line no-param-reassign
        arguments[1] = normalized;
      }
    } catch (e) {
      // swallow — we don't want normalization failures to break requests
    }
    return data;
  };
  try {
    const defaults = (instance && (instance as any).defaults) || null;
    const origTransforms =
      defaults && Array.isArray(defaults.transformResponse)
        ? defaults.transformResponse.slice()
        : defaults && defaults.transformResponse
          ? [defaults.transformResponse]
          : [];
    const transforms: any[] = [
      normalizeHeadersTransform,
      ...origTransforms.filter(Boolean),
    ];
    if (defaults) {
      defaults.transformResponse = transforms as any;
    }
  } catch (e) {
    // best-effort only
  }
  return instance;
};
