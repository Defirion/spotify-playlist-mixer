# Spotify Web API migration

Updated 2026-09-12 to track Spotify's 2026 Web API response and endpoint
changes.

## What changed

Spotify's [February 2026 Web API changelog](https://developer.spotify.com/documentation/web-api/references/changes/february-2026)
removed the catalog `popularity` property from track, album, and artist
responses. The app no longer models, calculates, displays, or tests that
value. The mixer now uses only playlist ratios, duration, source order, and
the optional `shuffleTracks` setting.

The same changelog renamed playlist content from `tracks` to `items` and
changed playlist item objects from `track` to `item`. The service reads
`/playlists/{playlist_id}/items` in pages of up to 50 and ignores unavailable
items. The [Get Playlist Items reference](https://developer.spotify.com/documentation/web-api/reference/get-playlists-items)
documents the current response and access requirements.

Playlist creation now uses `POST /me/playlists`; adding and removing playlist
content uses `/playlists/{playlist_id}/items`. The old user-scoped creation
route and playlist `/tracks` routes are no longer used.

Spotify also reduced the Search API limit to 10, with a default of 5. Both
track and playlist search enforce that limit in `src/services/spotify.ts`.
See the [Search reference](https://developer.spotify.com/documentation/web-api/reference/search).

## Application mapping

| Spotify API concern    | Application behavior                                   |
| ---------------------- | ------------------------------------------------------ |
| Playlist summary count | `playlist.items.total` via `getPlaylistItemCount`      |
| Playlist contents      | `GET /playlists/{id}/items`, max 50 per page           |
| Current playlist item  | `item.item`, with unavailable items filtered out       |
| Create playlist        | `POST /me/playlists`                                   |
| Add items              | `POST /playlists/{id}/items`, batches of 100 URIs      |
| Remove items           | `DELETE /playlists/{id}/items` with an `items` body    |
| Search                 | Default 5, maximum 10; browser market fallback         |
| Mixing signal          | Ratios, duration, playlist order, and explicit shuffle |

`getPlaylistItemCount` and the item mapper retain read-only fallbacks for old
in-memory snapshots that still contain `tracks` or `track`. Those fallbacks
are not sent back to Spotify and can be removed once old persisted/imported
snapshots are no longer relevant.

## Authentication and access

The app continues to use Spotify's recommended [Authorization Code with PKCE
flow](https://developer.spotify.com/documentation/web-api/concepts/authorization)
for browser applications. Spotify's current scopes documentation lists Search
and `GET /me` under `user-read-private`, so the app requests that scope in
addition to its playlist read and modify scopes. Access tokens remain in memory,
and `sessionStorage` is used only for the PKCE redirect state.

Playlist contents may require owner or collaborator access. Development-mode
access is controlled by Spotify: the app owner needs active Premium, and each
signed-in user needs to be on the app's allowlist. Spotify may let an
unqualified user finish OAuth and then return HTTP 403 from the Web API; the
app surfaces the provider's safe `message`/`reason` details when available and
does not retry it as a transient failure. Spotify's March 9 update postponed
the reduced endpoint-access rollout for existing integrations, while the
Premium requirement and five-user cap remained. Its later July 2026 quota
update raised the Client ID limit from one to 25 per developer account and made
Development Mode quota account-wide. Consult the current [quota modes
documentation](https://developer.spotify.com/documentation/web-api/concepts/quota-modes)
when configuring a Developer Dashboard app. The authenticated UI's optional
Spotify diagnostics panel compares `/me`, `/me/playlists`, and `/search` using
only a UTC run time, the granted scope names reported by Spotify, endpoint
statuses, and safe provider error details; it never displays access tokens or
profile fields. A user-triggered reconnect path sets `show_dialog=true` so a
troubleshooting run can obtain an explicit fresh approval instead of relying on
a previously approved browser session.

## Upgrade checklist for future changes

- Compare endpoint and response changes with Spotify's Web API changelog.
- Update `src/types/spotify.ts` before changing service mappers.
- Keep API limits in named constants and test the boundary values.
- Keep catalog popularity out of domain types and UI state unless Spotify
  officially restores a supported replacement.
- Run `npm run build`, `npm test`, and `npm run lint`.
