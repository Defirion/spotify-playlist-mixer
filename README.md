# Spotify Playlist Mixer

Spotify Playlist Mixer is a React/Vite app for combining tracks from several
Spotify playlists into a new, ratio-controlled playlist. It supports playlist
selection by URL or search, count- or time-based mixing, optional per-playlist
shuffling, presets, preview reordering, and saving the result back to Spotify.

## Current Spotify API support

This repository follows Spotify's February 2026 Web API changes:

- Playlist contents are read from `GET /playlists/{playlist_id}/items`.
- Playlist items use the `item` field; unavailable items are skipped.
- New playlists are created with `POST /me/playlists`.
- Tracks are added and removed through `/playlists/{playlist_id}/items`.
- Search requests use Spotify's current limit of 5 by default and 10 maximum.
- Search requests include a browser-market fallback when Spotify cannot infer the
  user's country from the access token.
- The removed catalog `popularity` value is not part of the app's types, mixer,
  UI, presets, or tests. Mixing is based on playlist ratios, track duration,
  playlist order, and the explicit shuffle setting.

See the [Spotify Web API February 2026 changelog](https://developer.spotify.com/documentation/web-api/references/changes/february-2026)
and the [Get Playlist Items reference](https://developer.spotify.com/documentation/web-api/reference/get-playlists-items)
for the upstream details.

## Prerequisites

- Node.js 22.18.0 (the version pinned by Volta)
- A Spotify Developer app and Client ID
- A Spotify Premium account for development-mode playlist access, subject to
  Spotify's current development-mode limits

## Local setup

1. Create or open a Spotify app in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Register `http://127.0.0.1:3000/` as a Redirect URI.
3. Create `.env` in the repository root:

   ```dotenv
   REACT_APP_SPOTIFY_CLIENT_ID=your_client_id
   ```

4. Install dependencies and start the Vite dev server:

   ```powershell
   npm install
   npm start
   ```

For the Netlify deployment, set the same `REACT_APP_SPOTIFY_CLIENT_ID` in the
site's production environment and register the exact production redirect URI
`https://spotify-mixer.netlify.app/` in the Spotify Developer Dashboard. Vite
injects this value during the Netlify build, so changing it requires a new
deploy. The repository includes `netlify.toml` with the build command, `build/`
publish directory, Node version, and SPA fallback.

The browser flow uses Authorization Code with PKCE. The verifier and state are
held in `sessionStorage` for the redirect round trip; access tokens remain in
memory. Never commit `.env` or a Client ID.

Spotify Development Mode also requires the app owner to have an active Premium
subscription and every signed-in user to be allowlisted. Spotify may allow the
OAuth login before enforcing those requirements at the Web API, which appears
in the app as HTTP 403. Spotify later postponed the reduced endpoint-access
rollout for existing integrations; the Premium requirement and five-user cap
still apply. A later July 2026 update raised the Client ID limit from one to 25
per developer account and made Development Mode quota account-wide. Spotify's
current scopes documentation lists Search and `GET /me` under
`user-read-private`, so the mixer requests that scope in addition to its
playlist scopes. The authenticated app includes a user-triggered Spotify
diagnostics panel that compares `/me`, `/me/playlists`, and `/search`, shows the
scope names Spotify reports as granted, and never displays access tokens or
profile fields. It also provides an explicit fresh-approval reconnect for
troubleshooting previously authorized sessions.

## Using the app

1. Connect your Spotify account.
2. Add playlists by searching or pasting Spotify playlist URLs.
3. Set each playlist's ratio using frequency or listening-time weighting.
4. Choose all songs, a song count, or a duration target.
5. Leave shuffle enabled for randomized source-playlist order, or disable it to
   preserve each playlist's returned order.
6. Preview, reorder, or remove tracks, then create the new Spotify playlist.

The app only mixes playable tracks returned by Spotify. Playlist contents can
require owner or collaborator access under Spotify's current permissions.

## Development commands

```powershell
npm start             # Vite development server
npm run build         # Type-check and create the production build in build/
npm test              # Run the Vitest suite once
npm run test:watch    # Run Vitest in watch mode
npm run test:coverage # Generate coverage output
npm run lint          # Run ESLint
npm run format:check  # Check Prettier formatting
```

## Project structure

```text
src/
├── components/       # UI and mixer screens
├── hooks/            # Spotify, preview, and mix-generation hooks
├── services/         # Spotify API, PKCE auth, fetch client
├── store/            # Zustand state slices
├── types/            # Spotify and application contracts
└── utils/mixer/      # Ratio-aware mixing and shuffling logic
docs/
└── SPOTIFY_API_MIGRATION.md
```

## Contributing

Please run `npm run build`, `npm test`, and `npm run lint` before opening a
pull request. Keep Spotify response fixtures aligned with the current `items`
shape and do not reintroduce popularity-based behavior.

## License

MIT
