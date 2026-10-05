# Spotify Playlist Mixer

Combine songs from a few Spotify playlists into one. Choose how much each
playlist contributes, set a song count or listening time, and check the mix
before saving it to Spotify.

You can find playlists by search or URL, shuffle their songs or keep them in
order, and apply built-in presets. The app is built with React and Vite.

## Using the app

1. Connect your Spotify account.
2. Search for playlists or paste their Spotify URLs.
3. Set how much of the mix should come from each playlist, by song count or
   listening time.
4. Choose a song count, a duration, or all songs.
5. Keep shuffle on to randomize songs within each playlist, or turn it off to
   use the order Spotify returns.
6. Preview the mix, move or remove tracks, then save it as a new Spotify playlist.

The mix uses your playlist ratios, song lengths, and ordering settings. It can
only include playable tracks that Spotify makes available to the app.

Before mixing, exhaustion guidance estimates which source may run out first.
You can apply suggested ratios based on source sizes or choose to continue with
remaining playlists. These estimates are advisory; check the generated preview.

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

## Deployment

For the Netlify deployment, set `REACT_APP_SPOTIFY_CLIENT_ID` in the site's
production environment and register `https://spotify-mixer.netlify.app/` as a
Redirect URI in the Spotify Developer Dashboard. If you host the app elsewhere,
use that site's URL instead. The redirect URI must match exactly.

Vite reads the Client ID at build time, so deploy again after changing it.
The included `netlify.toml` sets the build command, `build/` output directory,
Node version, and routing fallback.

## Spotify access and troubleshooting

The browser flow uses Authorization Code with PKCE. The verifier and state are
held in `sessionStorage` for the redirect round trip; access tokens remain in
memory. Never commit `.env` or a Client ID.

If you can sign in but get a 403 error when loading playlists or searching,
check the app's Development Mode access settings. The app owner needs an active
Premium subscription, and signed-in users need to be on the app's allowlist.
Some playlist contents may also require owner or collaborator access.

After signing in, you can open the Spotify diagnostics panel to check playlist
and search access. It does not display tokens or profile data.

See [Spotify API migration notes](docs/SPOTIFY_API_MIGRATION.md) for endpoint
details and the history of Spotify's access changes.

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
├── types/            # Spotify and app data types
└── utils/mixer/      # Playlist mixing and shuffling
docs/
└── SPOTIFY_API_MIGRATION.md
```

## Contributing

Please run `npm run build`, `npm test`, and `npm run lint` before opening a
pull request. When changing Spotify integration code, keep the response fixtures
consistent with the `items` format used by the app.

## License

MIT
