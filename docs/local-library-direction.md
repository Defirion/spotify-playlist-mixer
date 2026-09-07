# Local Library Direction

## Goal

Allow playlists from Spotify or other sources to be reproduced against a local music library without making Spotify the application's permanent domain model.

The intended flow is:

1. import a source playlist
2. normalize tracks into provider-neutral domain models
3. match source tracks against the local library
4. create a local playlist from confirmed matches
5. retain missing and ambiguous tracks as unresolved metadata

This document records architectural direction only. It is not an implementation commitment for the current repair cycle.

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

The mixer should be able to operate on canonical domain tracks regardless of where those tracks originated.

## Canonical Track Direction

The eventual internal track model should contain provider-neutral metadata such as:

```ts
type TrackSourceRef = {
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
  popularity?: number;
  sourceRefs: TrackSourceRef[];
};
```

Provider-specific metadata should remain optional. Missing metadata must not be fabricated merely to satisfy an old Spotify-shaped type.

## Canonical Playlist Direction

```ts
type Playlist = {
  id: string;
  name: string;
  tracks: Track[];
  source?: {
    provider: string;
    id: string;
  };
};
```

A source playlist may therefore come from Spotify, a local library, an exported file, or another provider without changing the mixer contract.

## Source and Destination Contracts

The current repair may introduce minimal contracts similar to:

```ts
interface PlaylistSource {
  getPlaylist(reference: string): Promise<Playlist>;
}

interface PlaylistDestination {
  createPlaylist(
    playlist: Playlist,
    resolvedTracks: readonly ResolvedTrack[]
  ): Promise<CreatedPlaylist>;
}
```

These are intentionally small. Do not build a generic plugin platform around them.

## Matching Model

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

The provider-boundary repair may add only:

- provider-neutral `Track`
- provider-neutral `Playlist`
- Spotify DTOs separate from domain models
- Spotify normalization functions
- `SpotifyGateway`
- `PlaylistSource`
- `PlaylistDestination`
- `matched` / `ambiguous` / `missing` result types

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
