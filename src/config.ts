// Central runtime configuration.
//
// In the browser Vite injects the value at build time via import.meta.env
// (envPrefix keeps the CRA-era REACT_APP_ name working on Netlify). Under
// Vitest, tests stub process.env.REACT_APP_SPOTIFY_CLIENT_ID at runtime, so
// prefer the live process.env value when one is present.
export function getSpotifyClientId(): string | undefined {
  if (
    typeof process !== 'undefined' &&
    process.env &&
    process.env.REACT_APP_SPOTIFY_CLIENT_ID !== undefined
  ) {
    return process.env.REACT_APP_SPOTIFY_CLIENT_ID;
  }
  return import.meta.env.REACT_APP_SPOTIFY_CLIENT_ID;
}
