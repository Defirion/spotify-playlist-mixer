# Local Library Direction

## Goal

Allow playlists from Spotify or other sources to be reproduced against a local music library without making Spotify the application's permanent domain model.

The intended flow is:

1. import a source playlist
2. normalize tracks into provider-neutral domain models
3. match source tracks against the local library
4. create a local playlist from confirmed matches
5. retain missing and ambiguous tracks as unresolved metadata

The canonical model and Spotify source/destination boundary were implemented on
5 October 2026. Local scanning, matching, playback, additional adapters and local
playlist output remain future direction. See [provider-boundary verification](provider-boundary-2026-10-05.md).

## Architectural Principle

Spotify is an integration, not the domain model.

```text
Source adapter
    ↓
canonical Track / Playlist
    ↓
mixer or library matcher
    ↓
destination adapter
```

The mixer now operates on canonical domain tracks. The editor still uses display DTOs through the gateway presentation bridge.

## Canonical Track Direction

The implemented subset in `src/types/domain.ts` contains:

```ts
type SourceRef = {
  provider: string;
  id: string;
  uri?: string;
};

type Track = {
  id: string;
  title: string;
  artists: string[];
  album?: string;
  durationMs: number;
  isrc?: string;
  releaseDate?: string;
  artworkUrl?: string;
  sourceRefs: SourceRef[];
};
```

Provider-specific metadata should remain optional. Missing metadata must not be fabricated merely to satisfy an old Spotify-shaped type.

## Canonical Playlist Direction

```ts
type Playlist = {
  id: string;
  name: string;
  tracks: Track[];
  source?: SourceRef;
  sourceTotal?: number;
};
```

A source playlist may therefore come from Spotify, a local library, an exported file, or another provider without changing the mixer contract.

## Source and Destination Contracts

The implemented contracts are in `src/types/domain.ts`: reads accept a small
playlist reference plus optional cancellation/progress; saves accept a canonical
playlist and an optional session-continuity check. Their current signatures are:

```ts
interface PlaylistSource {
  getPlaylist(
    reference: Pick<Playlist, 'id' | 'name' | 'source'>,
    options?: PlaylistReadOptions
  ): Promise<Playlist>;
}

interface PlaylistDestination {
  savePlaylist(
    playlist: Playlist,
    options?: { isSessionCurrent?: () => boolean }
  ): Promise<CreatedPlaylist>;
}
```

These are intentionally small. Do not build a generic plugin platform around them.

Current mixing uses ratios, durations, order and optional shuffling. It does not
rank tracks by popularity or fabricate provider metadata.

## Future matching model

A source track resolves as one of:

- `matched`
- `ambiguous`
- `missing`

Conceptually:

```ts
type TrackMatch =
  | { status: 'matched'; source: Track; localTrackId: string }
  | {
      status: 'ambiguous';
      source: Track;
      candidates: LocalTrackCandidate[];
    }
  | { status: 'missing'; source: Track };
```

An import should retain unresolved tracks rather than silently discarding them.

```ts
type PlaylistImportResult = {
  playlist: Playlist;
  matches: TrackMatch[];
};
```

That preserves enough information for a future local implementation to report what is missing and to re-evaluate unresolved tracks when the library changes.

## Future Matching Priority

When matching is eventually implemented, the intended priority is roughly:

1. exact ISRC when available on both sides
2. normalized artist + title exact match
3. artist + title with approximate duration
4. fuzzy normalization for punctuation, featured artists, remaster suffixes, and similar metadata noise
5. ambiguous rather than silently selecting a weak candidate

This is design direction, not code to implement during the current repair.

## Current Scaffold

Implemented for the first mixing path on 5 October 2026: provider-neutral models and source/destination contracts in `src/types/domain.ts`, Spotify normalization in `src/services/spotifyNormalizer.ts`, and `SpotifyGateway` behind preview and generation/save hooks. The mixer consumes canonical track fields. Existing UI/store DTOs remain behind an explicit adapter presentation bridge. See [the provider-boundary verification record](provider-boundary-2026-10-05.md).

The provider-boundary repair is limited to:

- provider-neutral `Track`
- provider-neutral `Playlist`
- Spotify DTOs separate from domain models
- Spotify normalization functions
- `SpotifyGateway`
- `PlaylistSource`
- `PlaylistDestination`
- `matched` / `ambiguous` / `missing` result types

Matching result types remain unimplemented until a matcher or unresolved-import consumer needs them. No matching or local-library runtime has been introduced.

## Deferred

Do not implement yet:

- local library scanner
- local database or index
- fuzzy matching algorithm
- Navidrome integration
- Jellyfin integration
- local playback
- automatic missing-track reconciliation
- UI for resolving ambiguous matches
- provider plugin discovery/registration framework

The backend choice should be made when there is an actual local playback implementation to integrate with, not guessed in advance.
