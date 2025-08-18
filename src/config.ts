// Spotify Configuration
// DO NOT COMMIT THIS FILE - IT'S IN .gitignore

export interface SpotifyConfig {
  clientId: string;
  redirectUri: string;
  scopes: string[];
}

// Spotify values should be provided via environment variables or a secure local config.
// This file exposes the `SpotifyConfig` interface only; keep secrets out of source.
