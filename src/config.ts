// Spotify Configuration
// DO NOT COMMIT THIS FILE - IT'S IN .gitignore

export interface SpotifyConfig {
  clientId: string;
  redirectUri: string;
  scopes: string[];
}

export const SPOTIFY_CLIENT_ID: string = '4803b23aaf60497d909466fd4e1ca0c5';

export const SPOTIFY_REDIRECT_URI: string =
  process.env.NODE_ENV === 'production'
    ? 'https://your-production-domain.com/callback'
    : 'http://localhost:3000/callback';

export const SPOTIFY_SCOPES: string[] = [
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-public',
  'playlist-modify-private',
  'user-read-private',
  'user-read-email',
];

export const spotifyConfig: SpotifyConfig = {
  clientId: SPOTIFY_CLIENT_ID,
  redirectUri: SPOTIFY_REDIRECT_URI,
  scopes: SPOTIFY_SCOPES,
};
