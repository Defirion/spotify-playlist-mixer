# Zustand store

The store divides application state into small slices instead of keeping
Spotify auth, playlist selection, mixing options, and UI feedback in one
component.

## Slices

- `authSlice.ts` — access token, current user, and login/logout state.
- `playlistSlice.ts` — loaded and selected playlists plus ratio settings.
- `mixingSlice.ts` — count/time targets, playlist name, and `shuffleTracks`.
- `uiSlice.ts` — normalized errors and success notifications.

Use the selector hooks exported from `src/store/index.ts`:

```typescript
import { useAuth, useMixOptions, usePlaylistSelection, useUI } from './store';

const { accessToken, isAuthenticated } = useAuth();
const { mixOptions, updateMixOptions } = useMixOptions();
const { selectedPlaylists } = usePlaylistSelection();
const { error, dismissError } = useUI();
```

For UI-visible errors, use the exported `setUIError` helper so unknown error
shapes are normalized consistently. Do not mutate store state directly.

Spotify access tokens are intentionally kept in memory only. The PKCE
verifier and OAuth state use `sessionStorage` for the redirect round trip; the
store does not persist credentials to `localStorage`.

## Testing

```powershell
npm test -- src/store/__tests__/store.test.ts
```

The full project commands are documented in the repository
[README](../../README.md). Spotify endpoint and response-shape changes are
tracked in [SPOTIFY_API_MIGRATION.md](../../docs/SPOTIFY_API_MIGRATION.md).
